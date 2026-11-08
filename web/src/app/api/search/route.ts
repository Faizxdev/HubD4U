import {NextRequest, NextResponse} from 'next/server';
import {fetchProviderModule} from '@/server/providerLoader';
import {executeModule} from '@/server/providerExecutor';
import {providerContext} from '@/server/providerContext';

export const dynamic = 'force-dynamic';

const searchCache = (globalThis as any).__searchCache || new Map<string, {data: any; ts: number}>();
(globalThis as any).__searchCache = searchCache;
const SEARCH_CACHE_TTL = 5 * 60 * 1000;

const DEFAULT_GLOBAL_PROVIDERS = [
  'modflix',
  'vega',
  'multi',
  'hdhub4u',
  'drive',
  'flixhq',
  'world4u'
];

async function searchSingleProvider(
  providerValue: string,
  searchQuery: string,
  page: number
): Promise<any[]> {
  try {
    const postsCode = await fetchProviderModule(providerValue, 'posts');
    if (!postsCode) return [];
    
    const postsModule = executeModule(postsCode) || {};
    const getSearch = postsModule.getSearchPosts || postsModule.default?.getSearchPosts;
    if (!getSearch) return [];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const data = await getSearch({
      searchQuery,
      page,
      providerValue,
      signal: controller.signal,
      providerContext,
    });

    clearTimeout(timeoutId);
    const items = Array.isArray(data) ? data : [];

    return items.map((item: any) => ({
      ...item,
      provider: providerValue,
    }));
  } catch (e: any) {
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    const {searchParams} = new URL(req.url);
    const providerValue = searchParams.get('provider') || 'all';
    const q = (searchParams.get('q') || searchParams.get('query') || '').trim();
    const page = Number(searchParams.get('page') || '1');

    if (!q) {
      return NextResponse.json({error: 'Query parameter q or query is required'}, {status: 400});
    }

    const cacheKey = `${providerValue}:${q.toLowerCase()}:${page}`;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < SEARCH_CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    // 1. Search in ALL providers simultaneously
    if (providerValue.toLowerCase() === 'all') {
      const searchPromises = DEFAULT_GLOBAL_PROVIDERS.map((p) =>
        searchSingleProvider(p, q, page)
      );

      const results = await Promise.allSettled(searchPromises);
      const allPosts: any[] = [];
      const seenTitles = new Set<string>();

      for (const res of results) {
        if (res.status === 'fulfilled' && Array.isArray(res.value)) {
          for (const item of res.value) {
            const key = `${item.title?.toLowerCase().trim()}-${item.provider}`;
            if (!seenTitles.has(key)) {
              seenTitles.add(key);
              allPosts.push(item);
            }
          }
        }
      }

      const responsePayload = {data: allPosts, total: allPosts.length, isMultiProvider: true};
      if (allPosts.length > 0) {
        searchCache.set(cacheKey, {data: responsePayload, ts: Date.now()});
      }
      return NextResponse.json(responsePayload);
    }

    // 2. Search in a single provider
    const singleResults = await searchSingleProvider(providerValue, q, page);
    const responsePayload = {data: singleResults, total: singleResults.length, isMultiProvider: false};
    if (singleResults.length > 0) {
      searchCache.set(cacheKey, {data: responsePayload, ts: Date.now()});
    }
    return NextResponse.json(responsePayload);
  } catch (e: any) {
    console.error('[SEARCH-API] Search route error:', e);
    return NextResponse.json({error: e?.message || 'error'}, {status: 500});
  }
}
