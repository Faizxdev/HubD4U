import {NextRequest, NextResponse} from 'next/server';
import {fetchProviderModule} from '@/server/providerLoader';
import {executeModule} from '@/server/providerExecutor';
import {providerContext} from '@/server/providerContext';

export const dynamic = 'force-dynamic';

const homeCache = (globalThis as any).__homeCache || new Map<string, {data: any; ts: number}>();
(globalThis as any).__homeCache = homeCache;
const HOME_CACHE_TTL = 5 * 60 * 1000;

export async function GET(req: NextRequest) {
  try {
    const {searchParams} = new URL(req.url);
    const providerValue = searchParams.get('provider') || '';
    const page = Number(searchParams.get('page') || '1');
    if (!providerValue) {
      return NextResponse.json({error: 'provider required'}, {status: 400});
    }

    const cacheKey = `${providerValue}:page${page}`;
    const cached = homeCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < HOME_CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    // Fetch catalog and posts modules concurrently
    const [catalogCode, postsCode] = await Promise.all([
      fetchProviderModule(providerValue, 'catalog'),
      fetchProviderModule(providerValue, 'posts'),
    ]);

    const catalogModule = catalogCode ? executeModule<any>(catalogCode) : {};
    const catalog = (catalogModule.catalog || catalogModule.default?.catalog || []) as Array<{title: string; filter: string}>;
    const genres = (catalogModule.genres || catalogModule.default?.genres || []) as Array<{title: string; filter: string}>;

    // Execute posts module once
    const pm = postsCode ? executeModule<any>(postsCode) : {};
    const callable =
      pm.getPosts ||
      pm.default?.getPosts ||
      pm.posts ||
      pm.default?.posts;

    const controller = new AbortController();
    const sections = (catalog || []).slice(0, 8); // Top 8 catalog rows for fast load

    const data = await Promise.all(
      sections.map(async sec => {
        try {
          if (!callable) {
            return {title: sec.title, filter: sec.filter, Posts: []};
          }
          const Posts = await callable({
            filter: sec.filter,
            page,
            providerValue,
            signal: controller.signal,
            providerContext,
          });
          return {title: sec.title, filter: sec.filter, Posts: Posts || []};
        } catch (err: any) {
          const message = err?.message || String(err);
          return {title: sec.title, filter: sec.filter, Posts: [], error: message};
        }
      }),
    );

    const result = {catalog, genres, data};
    if (data.some(s => s.Posts && s.Posts.length > 0)) {
      homeCache.set(cacheKey, {data: result, ts: Date.now()});
    }

    return NextResponse.json(result);
  } catch (e: any) {
    console.error('HOME API error', e);
    return NextResponse.json({catalog: [], genres: [], data: [], error: e?.message || 'error'});
  }
}
