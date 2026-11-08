import {NextRequest, NextResponse} from 'next/server';
import {fetchProviderModules} from '@/server/providerLoader';
import {executeModule} from '@/server/providerExecutor';
import {providerContext} from '@/server/providerContext';

// Helper to fetch and parse episodes from an external episodesLink URL (like nexdrive.pro)
async function fetchEpisodesFromExternalLink(episodesLink: string): Promise<Array<{ title: string; link: string }>> {
  const episodes: Array<{ title: string; link: string }> = [];
  
  try {
    console.log(`[EPISODES] Fetching external episodesLink: ${episodesLink}`);
    
    const response = await fetch(episodesLink, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(15000),
    });
    
    if (!response.ok) {
      console.warn(`[EPISODES] External link returned ${response.status}`);
      return episodes;
    }
    
    const html = await response.text();
    console.log(`[EPISODES] Fetched HTML (${html.length} chars)`);
    
    // Pattern 1: Look for episode headers like "-:Episodes: X:-" followed by links
    // Example: <h4>...-:Episodes: 1:-...</h4> ... <a href="https://vcloud.zip/...">
    const episodePattern = /-:Episodes?:?\s*(\d+):?-/gi;
    const linkPattern = /<a[^>]+href=["']([^"']+(?:vcloud|hubcloud|gdflix|pixeldrain|gofile|mediafire|mega\.nz|drive\.google)[^"']*)["'][^>]*>/gi;
    
    // Find all episode markers and their positions
    const episodeMarkers: Array<{ num: number; pos: number }> = [];
    let match;
    while ((match = episodePattern.exec(html)) !== null) {
      episodeMarkers.push({ num: parseInt(match[1]), pos: match.index });
    }
    
    // Find all download links and their positions
    const links: Array<{ url: string; pos: number }> = [];
    while ((match = linkPattern.exec(html)) !== null) {
      links.push({ url: match[1], pos: match.index });
    }
    
    console.log(`[EPISODES] Found ${episodeMarkers.length} episode markers and ${links.length} links`);
    
    // Match each episode marker with the closest following link
    for (const marker of episodeMarkers) {
      // Find the first link that comes after this marker
      const nextLink = links.find(l => l.pos > marker.pos);
      if (nextLink) {
        episodes.push({
          title: `Episode ${marker.num}`,
          link: nextLink.url,
        });
      }
    }
    
    // Pattern 2: If no episodes found, try button pattern
    // <button class="ep-button">Episode X</button> or similar with nearby links
    if (episodes.length === 0) {
      const buttonPattern = /<(?:button|a)[^>]*>(?:[^<]*Episode\s*(\d+)[^<]*|[^<]*Ep\s*(\d+)[^<]*)<\/(?:button|a)>/gi;
      const allLinks = [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>/gi)];
      
      let epNum = 1;
      while ((match = buttonPattern.exec(html)) !== null) {
        const num = parseInt(match[1] || match[2] || String(epNum));
        // Find nearest link
        const nearestLink = allLinks.find(l => l.index && l.index > match.index! - 500 && l.index < match.index! + 500);
        if (nearestLink && nearestLink[1]) {
          episodes.push({
            title: `Episode ${num}`,
            link: nearestLink[1],
          });
        }
        epNum++;
      }
    }
    
    // Pattern 3: Generic - find all vcloud/hubcloud links and number them
    if (episodes.length === 0) {
      const genericLinkPattern = /https?:\/\/(?:vcloud\.zip|hubcloud\.[a-z]+|gdflix\.[a-z]+)\/[^\s"'<>]+/gi;
      const genericLinks = html.match(genericLinkPattern) || [];
      
      genericLinks.forEach((link, idx) => {
        episodes.push({
          title: `Episode ${idx + 1}`,
          link: link,
        });
      });
    }
    
    console.log(`[EPISODES] Extracted ${episodes.length} episodes from external link`);
    
  } catch (e: any) {
    console.warn(`[EPISODES] Failed to fetch external episodesLink:`, e.message);
  }
  
  return episodes;
}

// Helper to parse season and episode from title like "Season-1 Ep-1" or "S1E1" or "Episode 1"
function parseEpisodeInfo(title: string): { season: number; episode: number } {
  // Try "Season-X Ep-Y" format
  const seasonEpMatch = title.match(/Season[- ]?(\d+)\s*Ep[- ]?(\d+)/i);
  if (seasonEpMatch) {
    return { season: parseInt(seasonEpMatch[1]), episode: parseInt(seasonEpMatch[2]) };
  }
  
  // Try "SXE Y" or "S X E Y" format
  const sxeyMatch = title.match(/S\s*(\d+)\s*E\s*(\d+)/i);
  if (sxeyMatch) {
    return { season: parseInt(sxeyMatch[1]), episode: parseInt(sxeyMatch[2]) };
  }
  
  // Try just episode number "Episode X" or "Ep X" or "E X"
  const epOnlyMatch = title.match(/(?:Episode|Ep|E)[- ]?(\d+)/i);
  if (epOnlyMatch) {
    return { season: 1, episode: parseInt(epOnlyMatch[1]) };
  }
  
  // Try just a number
  const numMatch = title.match(/(\d+)/);
  if (numMatch) {
    return { season: 1, episode: parseInt(numMatch[1]) };
  }
  
  return { season: 1, episode: 1 };
}

// Structure episodes into seasons
function structureEpisodes(episodes: Array<{ title: string; link: string }>): {
  seasons: Array<{
    season: number;
    episodes: Array<{ episode: number; title: string; link: string }>;
  }>;
  flat: Array<{ season: number; episode: number; title: string; link: string }>;
} {
  const episodesWithInfo = episodes.map(ep => ({
    ...ep,
    ...parseEpisodeInfo(ep.title),
  }));
  
  // Group by season
  const seasonMap = new Map<number, Array<{ episode: number; title: string; link: string }>>();
  
  for (const ep of episodesWithInfo) {
    if (!seasonMap.has(ep.season)) {
      seasonMap.set(ep.season, []);
    }
    seasonMap.get(ep.season)!.push({
      episode: ep.episode,
      title: ep.title,
      link: ep.link,
    });
  }
  
  // Sort episodes within each season
  const seasons = Array.from(seasonMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([season, eps]) => ({
      season,
      episodes: eps.sort((a, b) => a.episode - b.episode),
    }));
  
  return {
    seasons,
    flat: episodesWithInfo.sort((a, b) => a.season - b.season || a.episode - b.episode),
  };
}

export async function GET(req: NextRequest) {
  try {
    const {searchParams} = new URL(req.url);
    const providerValue = searchParams.get('provider') || '';
    const url = searchParams.get('url') || searchParams.get('link') || '';
    if (!url) {
      return NextResponse.json({error: 'url required'}, {status: 400});
    }
    
    console.log(`[EPISODES] Fetching episodes for provider: ${providerValue}, url: ${url}`);
    
    let episodes: Array<{ title: string; link: string }> = [];
    
    // Check if URL is an external episodesLink (like nexdrive.pro, hubdrive, etc.)
    // These URLs contain the actual episode download links
    const isExternalEpisodesLink = /^https?:\/\/(nexdrive\.pro|hubdrive|gdrive|drivehub|hubcloud|filepress)/i.test(url);
    
    if (isExternalEpisodesLink) {
      console.log('[EPISODES] Detected external episodesLink, fetching directly...');
      episodes = await fetchEpisodesFromExternalLink(url);
      
      if (episodes.length > 0) {
        console.log(`[EPISODES] Got ${episodes.length} episodes from external link`);
        const structured = structureEpisodes(episodes);
        return NextResponse.json({
          data: episodes,
          seasons: structured.seasons,
          totalEpisodes: episodes.length,
          totalSeasons: structured.seasons.length,
        });
      }
    }
    
    // If not external link or no episodes found, need provider
    if (!providerValue) {
      return NextResponse.json({error: 'provider required for non-external URLs'}, {status: 400});
    }
    
    const modules = await fetchProviderModules(providerValue);
    console.log(`[EPISODES] Available modules:`, Object.keys(modules));
    
    // Method 1: Try dedicated episodes module first (highest priority)
    if (episodes.length === 0 && modules.episodes) {
      console.log('[EPISODES] Trying dedicated episodes module...');
      try {
        const episodesModule = executeModule(modules.episodes);
        console.log('[EPISODES] Episodes module exports:', Object.keys(episodesModule || {}));
        
        // Try various function names
        const getEpisodesFn =
          (episodesModule as any).getEpisodes ||
          (episodesModule as any).default?.getEpisodes ||
          (episodesModule as any).GetEpisodes ||
          (episodesModule as any).default?.GetEpisodes ||
          (episodesModule as any).getEpisodeLinks ||
          (episodesModule as any).default?.getEpisodeLinks ||
          (episodesModule as any).episodes ||
          (episodesModule as any).default?.episodes;
        
        if (getEpisodesFn && typeof getEpisodesFn === 'function') {
          console.log('[EPISODES] Found episodes function, calling...');
          const data = await getEpisodesFn({
            url,
            link: url,
            provider: providerValue,
            providerContext,
          });
          console.log('[EPISODES] Episodes module result:', Array.isArray(data) ? `${data.length} episodes` : typeof data);
          
          if (Array.isArray(data) && data.length > 0) {
            episodes = data.map((ep: any) => ({
              title: ep.title || ep.name || ep.episodeTitle || `Episode ${ep.number || ep.episode || ep.ep || ''}`,
              link: ep.link || ep.url || ep.id || ep.episodeId || '',
            }));
          }
        }
      } catch (e: any) {
        console.warn('[EPISODES] Dedicated episodes module failed:', e.message);
      }
    }
    
    // Method 2: Try getEpisodeLinks from stream module
    if (episodes.length === 0 && modules.stream) {
      console.log('[EPISODES] Trying stream module getEpisodeLinks...');
      try {
        const streamModule = executeModule(modules.stream);
        console.log('[EPISODES] Stream module exports:', Object.keys(streamModule || {}));
        
        const getEpisodeLinks =
          (streamModule as any).getEpisodeLinks ||
          (streamModule as any).default?.getEpisodeLinks ||
          (streamModule as any).GetEpisodeLinks ||
          (streamModule as any).default?.GetEpisodeLinks;

        if (getEpisodeLinks && typeof getEpisodeLinks === 'function') {
          console.log('[EPISODES] Found getEpisodeLinks, calling...');
          const data = await getEpisodeLinks({
            url,
            link: url,
            providerContext,
          });
          console.log('[EPISODES] getEpisodeLinks result:', Array.isArray(data) ? `${data.length} episodes` : typeof data);
          
          if (Array.isArray(data) && data.length > 0) {
            episodes = data.map((ep: any) => ({
              title: ep.title || ep.name || `Episode`,
              link: ep.link || ep.url || '',
            }));
          }
        }
      } catch (e: any) {
        console.warn('[EPISODES] getEpisodeLinks failed:', e.message);
      }
    }
    
    // Method 3: Try to get from meta module (getMeta returns episodes in linkList)
    if (episodes.length === 0 && modules.meta) {
      console.log('[EPISODES] Trying meta module getMeta...');
      try {
        const metaModule = executeModule(modules.meta);
        console.log('[EPISODES] Meta module exports:', Object.keys(metaModule || {}));
        
        const getMeta = (metaModule as any).getMeta || (metaModule as any).default?.getMeta;
        
        if (getMeta && typeof getMeta === 'function') {
          console.log('[EPISODES] Found getMeta, calling...');
          const metaData = await getMeta({
            link: url,
            provider: providerValue,
            providerContext,
          });
          console.log('[EPISODES] getMeta result keys:', metaData ? Object.keys(metaData) : 'null');
          
          // Extract episodes from linkList[].directLinks
          if (metaData?.linkList && Array.isArray(metaData.linkList)) {
            console.log('[EPISODES] Found linkList with', metaData.linkList.length, 'items');
            for (const linkItem of metaData.linkList) {
              // Check for directLinks array
              if (linkItem.directLinks && Array.isArray(linkItem.directLinks) && linkItem.directLinks.length > 0) {
                console.log('[EPISODES] Found directLinks with', linkItem.directLinks.length, 'episodes');
                episodes.push(...linkItem.directLinks.map((ep: any) => ({
                  title: ep.title || ep.name || `Episode`,
                  link: ep.link || ep.url || '',
                })));
              }
              
              // Check for episodesLink (external URL to fetch episodes from)
              if (linkItem.episodesLink && typeof linkItem.episodesLink === 'string' && episodes.length === 0) {
                console.log('[EPISODES] Found episodesLink:', linkItem.episodesLink);
                const externalEpisodes = await fetchEpisodesFromExternalLink(linkItem.episodesLink);
                if (externalEpisodes.length > 0) {
                  // Add quality info to episode title if available
                  const quality = linkItem.quality || linkItem.title || '';
                  episodes.push(...externalEpisodes.map(ep => ({
                    title: quality ? `${ep.title} (${quality})` : ep.title,
                    link: ep.link,
                  })));
                }
              }
              
              // Some providers put episodes directly in linkList items
              if (linkItem.episodes && Array.isArray(linkItem.episodes)) {
                console.log('[EPISODES] Found episodes in linkItem with', linkItem.episodes.length, 'episodes');
                episodes.push(...linkItem.episodes.map((ep: any) => ({
                  title: ep.title || ep.name || `Episode ${ep.number || ''}`,
                  link: ep.link || ep.url || ep.id || '',
                })));
              }
            }
          }
          
          // Also check for episodes array directly on metaData
          if (metaData?.episodes && Array.isArray(metaData.episodes)) {
            console.log('[EPISODES] Found episodes array with', metaData.episodes.length, 'episodes');
            episodes.push(...metaData.episodes.map((ep: any) => ({
              title: ep.title || ep.name || `Episode ${ep.number || ep.episode || ''}`,
              link: ep.link || ep.url || ep.id || '',
            })));
          }
          
          // Check for seasons array
          if (metaData?.seasons && Array.isArray(metaData.seasons)) {
            console.log('[EPISODES] Found seasons array with', metaData.seasons.length, 'seasons');
            for (const season of metaData.seasons) {
              const seasonNum = season.season || season.number || 1;
              if (season.episodes && Array.isArray(season.episodes)) {
                episodes.push(...season.episodes.map((ep: any, idx: number) => ({
                  title: ep.title || `Season-${seasonNum} Ep-${ep.number || ep.episode || idx + 1}`,
                  link: ep.link || ep.url || ep.id || '',
                })));
              }
            }
          }
        }
      } catch (e: any) {
        console.warn('[EPISODES] getMeta fallback failed:', e.message);
      }
    }
    
    // Method 4: Try getEpisodes from meta module directly
    if (episodes.length === 0 && modules.meta) {
      console.log('[EPISODES] Trying meta module getEpisodes...');
      try {
        const metaModule = executeModule(modules.meta);
        const getEpisodes = 
          (metaModule as any).getEpisodes || 
          (metaModule as any).default?.getEpisodes ||
          (metaModule as any).GetEpisodes ||
          (metaModule as any).default?.GetEpisodes;
        
        if (getEpisodes && typeof getEpisodes === 'function') {
          console.log('[EPISODES] Found getEpisodes in meta, calling...');
          const data = await getEpisodes({
            url,
            link: url,
            provider: providerValue,
            providerContext,
          });
          console.log('[EPISODES] getEpisodes result:', Array.isArray(data) ? `${data.length} episodes` : typeof data);
          
          if (Array.isArray(data) && data.length > 0) {
            episodes = data.map((ep: any) => ({
              title: ep.title || ep.name || `Episode`,
              link: ep.link || ep.url || ep.id || '',
            }));
          }
        }
      } catch (e: any) {
        console.warn('[EPISODES] getEpisodes failed:', e.message);
      }
    }
    
    // Filter out empty links and duplicates
    episodes = episodes.filter(ep => ep.link && ep.link.trim() !== '');
    
    // Remove duplicates based on link
    const seen = new Set<string>();
    episodes = episodes.filter(ep => {
      if (seen.has(ep.link)) return false;
      seen.add(ep.link);
      return true;
    });
    
    console.log(`[EPISODES] Final result: ${episodes.length} episodes`);
    
    // Structure the episodes into seasons
    const structured = structureEpisodes(episodes);
    
    return NextResponse.json({
      data: episodes, // Flat list for backward compatibility
      seasons: structured.seasons, // Grouped by season
      totalEpisodes: episodes.length,
      totalSeasons: structured.seasons.length,
    });
  } catch (e: any) {
    console.error('[EPISODES] Error:', e);
    return NextResponse.json({error: e?.message || 'error'}, {status: 500});
  }
}


