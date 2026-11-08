import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Multiple API keys for fallback (free tier has 1000 requests/day limit)
const OMDB_API_KEYS = [
  '7755307f',
  'b9bd48a6',
  '3e974fca',
  'f4e5e0e7',
];
const BASE_URL = 'https://www.omdbapi.com';

export interface OMDBData {
  Title: string;
  Year: string;
  Rated: string;
  Released: string;
  Runtime: string;
  Genre: string;
  Director: string;
  Writer: string;
  Actors: string;
  Plot: string;
  Language: string;
  Country: string;
  Awards: string;
  Poster: string;
  Ratings: Array<{ Source: string; Value: string }>;
  Metascore: string;
  imdbRating: string;
  imdbVotes: string;
  imdbID: string;
  Type: string;
  DVD?: string;
  BoxOffice?: string;
  Production?: string;
  Website?: string;
  totalSeasons?: string;
  Response: string;
  Error?: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get('title');
  const imdbId = searchParams.get('imdbId');
  const year = searchParams.get('year');
  const type = searchParams.get('type'); // movie, series, episode

  if (!title && !imdbId) {
    return NextResponse.json({ error: 'Title or IMDB ID required' }, { status: 400 });
  }

  try {
    // Try each API key until one works
    for (const apiKey of OMDB_API_KEYS) {
      let url = `${BASE_URL}/?apikey=${apiKey}&plot=full`;
      
      if (imdbId) {
        // Search by IMDB ID (most accurate)
        url += `&i=${imdbId}`;
      } else if (title) {
        // Search by title
        const cleanTitle = title
          .replace(/\s*\(?\d{4}\)?$/, '') // Remove year from title
          .replace(/\s*-\s*Season\s*\d+.*$/i, '') // Remove season info
          .replace(/\s*S\d+.*$/i, '') // Remove S01 format
          .replace(/\s*\[.*?\]/g, '') // Remove brackets
          .replace(/\s*\(.*?\)/g, '') // Remove parentheses
          .replace(/\s*(720p|1080p|480p|2160p|4K|HDRip|WEB-DL|BluRay|BRRip|DVDRip).*$/i, '') // Remove quality
          .trim();
        
        url += `&t=${encodeURIComponent(cleanTitle)}`;
        
        if (year) {
          url += `&y=${year}`;
        }
        
        if (type) {
          url += `&type=${type}`;
        }
      }

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });

      const data: OMDBData = await response.json();

      // Check if rate limited
      if (data.Error === 'Request limit reached!') {
        console.log(`[OMDB] API key ${apiKey.slice(0, 4)}... rate limited, trying next...`);
        continue;
      }

      if (data.Response === 'False') {
        // Try searching without year if first attempt failed
        if (title && year) {
          const retryUrl = `${BASE_URL}/?apikey=${apiKey}&plot=full&t=${encodeURIComponent(title)}`;
          const retryResponse = await fetch(retryUrl);
          const retryData: OMDBData = await retryResponse.json();
          
          if (retryData.Error === 'Request limit reached!') {
            continue;
          }
          
          if (retryData.Response === 'True') {
            return NextResponse.json({ data: formatOMDBResponse(retryData) });
          }
        }
        
        return NextResponse.json({ error: data.Error || 'Not found' }, { status: 404 });
      }

      return NextResponse.json({ data: formatOMDBResponse(data) });
    }
    
    // All API keys exhausted
    return NextResponse.json({ error: 'OMDB API rate limit reached. Please try again later.' }, { status: 429 });
  } catch (error: any) {
    console.error('[OMDB] Error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch OMDB data' }, { status: 500 });
  }
}

function formatOMDBResponse(data: OMDBData) {
  return {
    title: data.Title,
    year: data.Year,
    rated: data.Rated,
    released: data.Released,
    runtime: data.Runtime,
    genre: data.Genre?.split(', ') || [],
    director: data.Director?.split(', ') || [],
    writer: data.Writer?.split(', ') || [],
    actors: data.Actors?.split(', ') || [],
    plot: data.Plot,
    language: data.Language,
    country: data.Country,
    awards: data.Awards,
    poster: data.Poster !== 'N/A' ? data.Poster : null,
    ratings: data.Ratings?.map(r => ({
      source: r.Source,
      value: r.Value,
    })) || [],
    metascore: data.Metascore !== 'N/A' ? data.Metascore : null,
    imdbRating: data.imdbRating !== 'N/A' ? data.imdbRating : null,
    imdbVotes: data.imdbVotes !== 'N/A' ? data.imdbVotes : null,
    imdbId: data.imdbID,
    type: data.Type,
    boxOffice: data.BoxOffice !== 'N/A' ? data.BoxOffice : null,
    production: data.Production !== 'N/A' ? data.Production : null,
    totalSeasons: data.totalSeasons,
  };
}
