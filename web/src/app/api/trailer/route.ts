import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// TMDB API for trailers (free tier available)
const TMDB_API_KEY = '4ef0d7355d9ffb5151e987764708ce96';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// CORS proxies to bypass network restrictions
const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
  'https://proxy.cors.sh/',
];

interface TMDBVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

interface TrailerResult {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  url: string;
  thumbnail: string;
}

// Helper function to fetch with proxy fallback
async function fetchWithProxy(url: string, timeout = 12000): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Try direct first
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    clearTimeout(timeoutId);
    if (response.ok) {
      return await response.json();
    }
  } catch (e: any) {
    clearTimeout(timeoutId);
    console.log('[TRAILER] Direct fetch failed, trying proxies...');
  }

  // Try proxies
  for (const proxy of CORS_PROXIES) {
    const proxyController = new AbortController();
    const proxyTimeoutId = setTimeout(() => proxyController.abort(), timeout);

    try {
      const proxyUrl = proxy + encodeURIComponent(url);
      console.log('[TRAILER] Trying proxy:', proxy.slice(0, 30));
      const response = await fetch(proxyUrl, {
        signal: proxyController.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(proxyTimeoutId);

      if (response.ok) {
        const data = await response.json();
        console.log('[TRAILER] Proxy success');
        return data;
      }
    } catch (e: any) {
      clearTimeout(proxyTimeoutId);
      console.log('[TRAILER] Proxy failed:', e.message);
    }
  }

  throw new Error('All fetch attempts failed');
}

// Fallback: Generate YouTube search URL for trailer
function getYouTubeSearchUrl(title: string, year?: string): string {
  const query = `${title} ${year || ''} official trailer`.trim();
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const imdbId = searchParams.get('imdbId');
  const title = searchParams.get('title');
  const year = searchParams.get('year');
  const type = searchParams.get('type') || 'movie'; // movie or tv

  if (!imdbId && !title) {
    return NextResponse.json({ error: 'IMDB ID or title required' }, { status: 400 });
  }

  try {
    let tmdbId: number | null = null;

    // First, find TMDB ID
    if (imdbId) {
      try {
        // Find by IMDB ID
        const findUrl = `${TMDB_BASE_URL}/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
        console.log('[TRAILER] Finding by IMDB ID:', imdbId);
        const findData = await fetchWithProxy(findUrl);

        if (type === 'tv' || type === 'series') {
          tmdbId = findData.tv_results?.[0]?.id;
        } else {
          tmdbId = findData.movie_results?.[0]?.id;
        }
        console.log('[TRAILER] Found TMDB ID:', tmdbId);
      } catch (e: any) {
        console.error('[TRAILER] Find by IMDB error:', e.message);
      }
    }

    // If no IMDB ID or not found, search by title
    if (!tmdbId && title) {
      try {
        const cleanTitle = title
          .replace(/\s*\(?\d{4}\)?$/, '')
          .replace(/\s*-\s*Season\s*\d+.*$/i, '')
          .replace(/\s*S\d+.*$/i, '')
          .replace(/\s*\[.*?\]/g, '')
          .replace(/\s*\(.*?\)/g, '')
          .replace(/\s*(720p|1080p|480p|2160p|4K|HDRip|WEB-DL|BluRay).*$/i, '')
          .trim();

        const mediaType = type === 'tv' || type === 'series' ? 'tv' : 'movie';
        let searchUrl = `${TMDB_BASE_URL}/search/${mediaType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanTitle)}`;
        if (year) searchUrl += `&year=${year}`;

        console.log('[TRAILER] Searching by title:', cleanTitle);
        const searchData = await fetchWithProxy(searchUrl);
        tmdbId = searchData.results?.[0]?.id;
        console.log('[TRAILER] Search found TMDB ID:', tmdbId);
      } catch (e: any) {
        console.error('[TRAILER] Search error:', e.message);
      }
    }

    if (!tmdbId) {
      // Return fallback when TMDB ID not found
      const searchTitle = title || imdbId || '';
      const fallbackUrl = getYouTubeSearchUrl(searchTitle, year || undefined);
      return NextResponse.json({
        error: 'Content not found on TMDB',
        trailers: [],
        fallback: {
          type: 'youtube_search',
          url: fallbackUrl,
          message: 'Search YouTube for trailers.',
        },
      });
    }

    // Fetch videos/trailers
    const mediaType = type === 'tv' || type === 'series' ? 'tv' : 'movie';
    const videosUrl = `${TMDB_BASE_URL}/${mediaType}/${tmdbId}/videos?api_key=${TMDB_API_KEY}`;
    console.log('[TRAILER] Fetching videos for TMDB ID:', tmdbId);
    const videosData = await fetchWithProxy(videosUrl);

    if (!videosData.results || videosData.results.length === 0) {
      const searchTitle = title || imdbId || '';
      const fallbackUrl = getYouTubeSearchUrl(searchTitle, year || undefined);
      return NextResponse.json({
        data: { tmdbId, trailers: [], mainTrailer: null },
        error: 'No trailers found',
        fallback: {
          type: 'youtube_search',
          url: fallbackUrl,
          message: 'No trailers on TMDB. Search YouTube.',
        },
      });
    }

    // Filter and sort videos - prioritize official trailers from YouTube
    const videos: TMDBVideo[] = videosData.results;
    const trailers = videos
      .filter(v => v.site === 'YouTube')
      .sort((a, b) => {
        // Prioritize: Official Trailer > Trailer > Teaser > Others
        const priority = (v: TMDBVideo) => {
          if (v.type === 'Trailer' && v.official) return 0;
          if (v.type === 'Trailer') return 1;
          if (v.type === 'Teaser' && v.official) return 2;
          if (v.type === 'Teaser') return 3;
          return 4;
        };
        return priority(a) - priority(b);
      })
      .map((v): TrailerResult => ({
        id: v.id,
        key: v.key,
        name: v.name,
        site: v.site,
        type: v.type,
        url: `https://www.youtube.com/watch?v=${v.key}`,
        thumbnail: `https://img.youtube.com/vi/${v.key}/maxresdefault.jpg`,
      }));

    console.log('[TRAILER] Found', trailers.length, 'trailers');

    return NextResponse.json({
      data: {
        tmdbId,
        trailers,
        mainTrailer: trailers[0] || null,
      }
    });
  } catch (error: any) {
    console.error('[TRAILER] Error:', error.message);

    // On timeout or network error, return YouTube search fallback
    const searchTitle = title || imdbId || '';
    const fallbackUrl = getYouTubeSearchUrl(searchTitle, year || undefined);

    return NextResponse.json({
      error: error.name === 'AbortError' ? 'TMDB request timeout' : 'Failed to fetch trailers',
      details: error.message,
      fallback: {
        type: 'youtube_search',
        url: fallbackUrl,
        message: 'TMDB unavailable. Search YouTube for trailers.',
      },
    });
  }
}
