import { NextRequest, NextResponse } from 'next/server';
import { fetchProviderModule } from '@/server/providerLoader';
import { executeModule } from '@/server/providerExecutor';
import { providerContext } from '@/server/providerContext';
import { getBaseUrl } from '@/server/getBaseUrl';

export const dynamic = 'force-dynamic';

// Global in-memory cache for streams (15 min TTL)
const streamCache = (globalThis as any).__streamCache || new Map<string, { data: any[]; ts: number }>();
(globalThis as any).__streamCache = streamCache;
const CACHE_TTL = 15 * 60 * 1000;

function getCacheKey(provider: string, link: string): string {
  return `${provider}:${link}`;
}

// Priority ranking for streams: fast, browser-compatible formats (HLS, MP4, Pixeldrain) first!
function rankStream(s: any): number {
  if (!s || !s.link) return 0;
  const link = (s.link || '').toLowerCase();
  const server = (s.server || '').toLowerCase();
  const type = (s.type || '').toLowerCase();

  // 1. HLS adaptive stream (.m3u8) - Instant startup, lowest RAM usage, adaptive bitrate
  if (link.includes('.m3u8') || type === 'm3u8') return 100;

  // 2. Pixeldrain direct API - Ultra high speed CDN (100MB/s), full Range request support, zero proxy overhead
  if (link.includes('pixeldrain.com/api/file/')) return 95;

  // 3. Fast direct MP4 streams - 100% universal browser hardware decoding, AAC audio (never buffers on audio)
  if (type === 'mp4' || link.endsWith('.mp4') || link.includes('.mp4?')) return 90;

  // 4. Cloudflare R2 / Storage / Worker direct streams
  if (link.includes('cloudflarestorage') || link.includes('workers.dev') || link.includes('fastdl')) return 85;

  // 5. HubCloud / HubCdn / GdFlix Direct
  if (server.includes('hubcdn') || server.includes('fastdl')) return 80;

  // 6. GoFile Direct link (storeX.gofile.io)
  if (link.includes('gofile.io/download/')) return 70;

  // 7. General WebM
  if (type === 'webm' || link.includes('.webm')) return 60;

  // 8. General direct MKV (if from CDN)
  if (server.includes('hubcloud') || server.includes('direct')) return 50;

  // 9. Slow 3rd party filehosts (MegaUp, etc.) - rate-limited, frequently stall with AC3 audio
  if (link.includes('megaup') || server.includes('megaup')) return 20;

  return 30;
}

// Fast parallel extraction - returns all successful results
async function fastExtract(link: string, type: string, signal: AbortSignal): Promise<any[]> {
  const results: any[] = [];
  
  // Fast path: PixelDrain direct conversion
  if (link.includes('pixeldrain.com/u/')) {
    const id = link.split('/u/')[1]?.split('?')[0]?.split('/')[0];
    if (id) {
      return [{
        server: 'Pixeldrain Direct',
        link: `https://pixeldrain.com/api/file/${id}?download`,
        type: 'mkv',
        quality: 'Original',
      }];
    }
  }

  // Import extractors in parallel
  const [
    { hubcloudExtracter },
    { gdFlixExtracter },
    { gofileExtracter },
  ] = await Promise.all([
    import('@/server/extractors/hubcloud'),
    import('@/server/extractors/gdflix'),
    import('@/server/extractors/gofile'),
  ]);

  const extractorTimeout = 6500;
  const extractorPromises: Promise<any[]>[] = [];

  const runGofile = async (rawLink: string): Promise<any[]> => {
    try {
      const id = rawLink.split('/d/')[1]?.split('?')[0] || rawLink.split('/').filter(Boolean).pop() || '';
      if (!id) return [];
      const res = await gofileExtracter(id);
      if (res?.link) {
        return [{ server: 'GoFile Direct', link: res.link, type: 'mkv' }];
      }
    } catch {}
    return [];
  };

  // Match extractor to link type for maximum speed
  if (/hubcloud|vcloud|hubdrive/i.test(link)) {
    extractorPromises.push(
      Promise.race([
        hubcloudExtracter(link, signal).catch(() => []),
        new Promise<any[]>(resolve => setTimeout(() => resolve([]), extractorTimeout))
      ])
    );
  } else if (/gdflix|gdrive/i.test(link)) {
    extractorPromises.push(
      Promise.race([
        gdFlixExtracter(link, signal).catch(() => []),
        new Promise<any[]>(resolve => setTimeout(() => resolve([]), extractorTimeout))
      ])
    );
  } else if (/gofile/i.test(link)) {
    extractorPromises.push(
      Promise.race([
        runGofile(link).catch(() => []),
        new Promise<any[]>(resolve => setTimeout(() => resolve([]), extractorTimeout))
      ])
    );
  } else {
    extractorPromises.push(
      Promise.race([
        hubcloudExtracter(link, signal).catch(() => []),
        new Promise<any[]>(resolve => setTimeout(() => resolve([]), extractorTimeout))
      ]),
      Promise.race([
        gdFlixExtracter(link, signal).catch(() => []),
        new Promise<any[]>(resolve => setTimeout(() => resolve([]), extractorTimeout))
      ]),
      Promise.race([
        runGofile(link).catch(() => []),
        new Promise<any[]>(resolve => setTimeout(() => resolve([]), extractorTimeout))
      ])
    );
  }

  const settled = await Promise.allSettled(extractorPromises);
  const seen = new Set<string>();

  for (const item of settled) {
    if (item.status === 'fulfilled' && Array.isArray(item.value)) {
      for (const s of item.value) {
        if (s?.link && !seen.has(s.link)) {
          seen.add(s.link);
          results.push(s);
        }
      }
    }
  }

  return results
    .filter(s => s?.link && !s.link.includes('gofile.io/d/'))
    .sort((a, b) => rankStream(b) - rankStream(a));
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(req.url);
    const providerValue = searchParams.get('provider') || '';
    const link = searchParams.get('link') || '';
    const type = searchParams.get('type') || 'movie';
    const skipCache = searchParams.get('nocache') === 'true';

    if (!link) {
      return NextResponse.json({ error: 'link parameter required' }, { status: 400 });
    }

    // Check cache first
    const cacheKey = getCacheKey(providerValue, link);
    if (!skipCache) {
      const cached = streamCache.get(cacheKey);
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        return NextResponse.json({ 
          data: cached.data, 
          source: 'cache',
          timing: Date.now() - startTime 
        });
      }
    }

    // Resolve relative URLs
    let resolvedLink = link;
    if (link.startsWith('/') && !link.startsWith('//')) {
      try {
        const baseUrl = await getBaseUrl(providerValue);
        if (baseUrl) {
          resolvedLink = baseUrl.replace(/\/$/, '') + link;
        }
      } catch {}
    }

    // Instant Direct Stream detection: If link is ALREADY a playable video
    if (
      /\.(mp4|mkv|m3u8|webm)($|\?)/i.test(resolvedLink) ||
      resolvedLink.includes('cloudflarestorage') ||
      resolvedLink.includes('pixeldrain.com/api/file/')
    ) {
      const isHls = resolvedLink.includes('.m3u8');
      const direct = [{
        server: isHls ? 'HLS CDN' : 'Fast Direct Stream',
        link: resolvedLink,
        type: isHls ? 'm3u8' : 'mkv',
        quality: '1080p',
      }];
      streamCache.set(cacheKey, { data: direct, ts: Date.now() });
      return NextResponse.json({
        data: direct,
        source: 'direct',
        timing: Date.now() - startTime
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const isExternalHost = /hubcloud|vcloud|hubdrive|gdflix|gofile|pixeldrain|fastdl|firecdn|supervideo/i.test(resolvedLink);

      // If it's an external host link, extract directly without loading provider scraper
      if (isExternalHost) {
        const extractorData = await fastExtract(resolvedLink, type, controller.signal);
        clearTimeout(timeout);

        if (extractorData.length > 0) {
          streamCache.set(cacheKey, { data: extractorData, ts: Date.now() });
          return NextResponse.json({ 
            data: extractorData, 
            source: 'fast-extractors',
            timing: Date.now() - startTime 
          });
        }
      }

      // Try provider stream module for provider internal pages
      if (providerValue) {
        const streamCode = await fetchProviderModule(providerValue, 'stream');
        if (streamCode) {
          const streamModule = executeModule(streamCode);
          const getStream = (streamModule as any).getStream || (streamModule as any).default?.getStream;

          if (typeof getStream === 'function') {
            const [providerResult, extractorResult] = await Promise.allSettled([
              getStream({
                link: resolvedLink,
                type,
                signal: controller.signal,
                providerContext,
              }),
              isExternalHost ? Promise.resolve([]) : fastExtract(resolvedLink, type, controller.signal),
            ]);

            const merged: any[] = [];
            const seen = new Set<string>();

            if (providerResult.status === 'fulfilled' && Array.isArray(providerResult.value)) {
              for (const s of providerResult.value) {
                if (s?.link && !seen.has(s.link)) {
                  seen.add(s.link);
                  merged.push(s);
                }
              }
            }
            if (extractorResult.status === 'fulfilled' && Array.isArray(extractorResult.value)) {
              for (const s of extractorResult.value) {
                if (s?.link && !seen.has(s.link)) {
                  seen.add(s.link);
                  merged.push(s);
                }
              }
            }

            const sortedMerged = merged
              .filter(s => s?.link && !s.link.includes('gofile.io/d/'))
              .sort((a, b) => rankStream(b) - rankStream(a));

            if (sortedMerged.length > 0) {
              streamCache.set(cacheKey, { data: sortedMerged, ts: Date.now() });
              clearTimeout(timeout);
              return NextResponse.json({ 
                data: sortedMerged, 
                source: 'provider+extractors',
                timing: Date.now() - startTime 
              });
            }
          }
        }
      }

      // Fallback to extractors
      const fallbackData = await fastExtract(resolvedLink, type, controller.signal);
      clearTimeout(timeout);

      if (fallbackData.length > 0) {
        streamCache.set(cacheKey, { data: fallbackData, ts: Date.now() });
        return NextResponse.json({ 
          data: fallbackData, 
          source: 'extractors-fallback',
          timing: Date.now() - startTime 
        });
      }

      // If nothing found but resolvedLink is a URL, provide fallback direct link
      if (resolvedLink.startsWith('http')) {
        const fallbackSingle = [{
          server: 'Original Link',
          link: resolvedLink,
          type: 'mkv',
          quality: 'Original',
        }];
        return NextResponse.json({
          data: fallbackSingle,
          source: 'original-fallback',
          timing: Date.now() - startTime
        });
      }

      return NextResponse.json({ 
        data: [], 
        error: 'No streams found',
        timing: Date.now() - startTime 
      });

    } catch (e: any) {
      clearTimeout(timeout);
      if (e.name === 'AbortError') {
        return NextResponse.json({ error: 'Request timeout', timing: Date.now() - startTime }, { status: 408 });
      }
      throw e;
    }
  } catch (e: any) {
    console.error(`[STREAM-FAST] Error:`, e.message);
    return NextResponse.json({ 
      error: e?.message || 'Unknown error',
      timing: Date.now() - startTime 
    }, { status: 500 });
  }
}
