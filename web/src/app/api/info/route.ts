import {NextRequest, NextResponse} from 'next/server';
import {fetchProviderModule} from '@/server/providerLoader';
import {executeModule} from '@/server/providerExecutor';
import {providerContext} from '@/server/providerContext';

export const dynamic = 'force-dynamic';

const infoCache = (globalThis as any).__infoCache || new Map<string, {data: any; ts: number}>();
(globalThis as any).__infoCache = infoCache;
const INFO_CACHE_TTL = 15 * 60 * 1000;

// Helper to parse season and episode from title
function parseEpisodeInfo(title: string): { season: number; episode: number } {
  const seasonEpMatch = title.match(/Season[- ]?(\d+)\s*Ep[- ]?(\d+)/i);
  if (seasonEpMatch) {
    return { season: parseInt(seasonEpMatch[1]), episode: parseInt(seasonEpMatch[2]) };
  }
  const sxeyMatch = title.match(/S\s*(\d+)\s*E\s*(\d+)/i);
  if (sxeyMatch) {
    return { season: parseInt(sxeyMatch[1]), episode: parseInt(sxeyMatch[2]) };
  }
  const epOnlyMatch = title.match(/(?:Episode|Ep|E)[- ]?(\d+)/i);
  if (epOnlyMatch) {
    return { season: 1, episode: parseInt(epOnlyMatch[1]) };
  }
  const numMatch = title.match(/(\d+)/);
  if (numMatch) {
    return { season: 1, episode: parseInt(numMatch[1]) };
  }
  return { season: 1, episode: 1 };
}

// Structure episodes into seasons
function structureIntoSeasons(episodes: Array<{ title: string; link: string }>): Array<{
  season: number;
  episodes: Array<{ episode: number; title: string; link: string }>;
}> {
  const seasonMap = new Map<number, Array<{ episode: number; title: string; link: string }>>();
  
  for (const ep of episodes) {
    const { season, episode } = parseEpisodeInfo(ep.title);
    if (!seasonMap.has(season)) {
      seasonMap.set(season, []);
    }
    seasonMap.get(season)!.push({ episode, title: ep.title, link: ep.link });
  }
  
  return Array.from(seasonMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([season, eps]) => ({
      season,
      episodes: eps.sort((a, b) => a.episode - b.episode),
    }));
}

export async function GET(req: NextRequest) {
  try {
    const {searchParams} = new URL(req.url);
    const providerValue = searchParams.get('provider') || '';
    const link = searchParams.get('link') || '';
    if (!providerValue || !link) {
      return NextResponse.json({error: 'provider and link required'}, {status: 400});
    }

    const cacheKey = `${providerValue}:${link}`;
    const cached = infoCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < INFO_CACHE_TTL) {
      return NextResponse.json({data: cached.data});
    }
    
    const metaCode = await fetchProviderModule(providerValue, 'meta');
    if (!metaCode) {
      return NextResponse.json({error: 'meta module unavailable for this provider'}, {status: 500});
    }

    const metaModule = executeModule(metaCode) || {};
    const getMeta = (metaModule as any).getMeta || (metaModule as any).default?.getMeta;
    
    if (!getMeta) {
      return NextResponse.json({error: 'getMeta not available for this provider'}, {status: 500});
    }

    const data = await getMeta({
      link,
      provider: providerValue,
      providerContext,
    });

    if (data && data.linkList && Array.isArray(data.linkList)) {
      const hasEpisodesLinks = data.linkList.some((item: any) => item.episodesLink);
      if (hasEpisodesLinks) {
        data.linkList = data.linkList.map((item: any) => ({
          ...item,
          link: item.episodesLink || item.link,
          episodesLink: item.episodesLink,
        }));
      }
    }

    // Structure series episodes if directLinks populated
    if (data && (data.type === 'series' || data.type === 'tv' || data.type === 'anime' || data.type === 'show')) {
      let allEpisodes: Array<{ title: string; link: string }> = [];
      
      if (data.linkList && Array.isArray(data.linkList)) {
        for (const linkItem of data.linkList) {
          if (linkItem.directLinks && Array.isArray(linkItem.directLinks) && linkItem.directLinks.length > 0) {
            allEpisodes.push(...linkItem.directLinks.map((ep: any) => ({
              title: ep.title || ep.name || 'Episode',
              link: ep.link || ep.url || '',
            })));
          }
        }
      }
      
      if (data.episodes && Array.isArray(data.episodes)) {
        allEpisodes.push(...data.episodes.map((ep: any) => ({
          title: ep.title || ep.name || `Episode ${ep.number || ep.episode || ''}`,
          link: ep.link || ep.url || ep.id || '',
        })));
      }
      
      allEpisodes = allEpisodes.filter(ep => ep.link && ep.link.trim() !== '');
      const seen = new Set<string>();
      allEpisodes = allEpisodes.filter(ep => {
        if (seen.has(ep.link)) return false;
        seen.add(ep.link);
        return true;
      });
      
      if (allEpisodes.length > 0) {
        const seasons = structureIntoSeasons(allEpisodes);
        data.seasons = seasons;
        data.totalEpisodes = allEpisodes.length;
        data.totalSeasons = seasons.length;
      }
    }

    if (data) {
      infoCache.set(cacheKey, {data, ts: Date.now()});
    }

    return NextResponse.json({data});
  } catch (e: any) {
    console.error('[INFO] Error:', e);
    return NextResponse.json({error: e?.message || 'error'}, {status: 500});
  }
}
