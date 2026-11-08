import {NextRequest, NextResponse} from 'next/server';
import {fetchProviderModule} from '@/server/providerLoader';
import {executeModule} from '@/server/providerExecutor';
import {providerContext} from '@/server/providerContext';

export async function GET(req: NextRequest) {
  try {
    const {searchParams} = new URL(req.url);
    const providerValue = searchParams.get('provider') || '';
    const filter = searchParams.get('filter') || '';
    const page = Number(searchParams.get('page') || '1');
    if (!providerValue || !filter) {
      return NextResponse.json({error: 'provider and filter required'}, {status: 400});
    }
    const postsCode = await fetchProviderModule(providerValue, 'posts');
    const postsModule = postsCode ? executeModule<any>(postsCode) : {};
    const getPosts =
      postsModule.getPosts || postsModule.default?.getPosts || postsModule.posts || postsModule.default?.posts;
    const controller = new AbortController();
    const data = await getPosts?.({
      filter,
      page,
      providerValue,
      signal: controller.signal,
      providerContext,
    });
    return NextResponse.json({data: data || []});
  } catch (e: any) {
    return NextResponse.json({error: e?.message || 'error'}, {status: 500});
  }
}
