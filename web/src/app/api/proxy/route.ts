import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Max allowed duration on Vercel Pro

function detectContentType(url: string, upstreamType: string | null): string {
  if (upstreamType && upstreamType !== 'application/octet-stream' && upstreamType !== 'text/plain' && upstreamType !== 'binary/octet-stream') {
    return upstreamType;
  }
  const clean = url.split('?')[0].toLowerCase();
  if (clean.endsWith('.mp4') || clean.endsWith('.m4v')) return 'video/mp4';
  if (clean.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl';
  if (clean.endsWith('.webm')) return 'video/webm';
  if (clean.endsWith('.mkv')) return 'video/x-matroska';
  if (clean.endsWith('.ts')) return 'video/mp2t';
  return 'video/mp4';
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  const referer = searchParams.get('referer') || undefined;
  const isDownload = searchParams.get('download') === 'true';
  const allowRedirect = searchParams.get('redirect') === 'true';
  
  if (!url || !/^https?:\/\//i.test(url)) {
    return new Response(JSON.stringify({ error: 'Valid HTTP/HTTPS url parameter required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Fast direct 302 redirect for known CORS-enabled CDNs (Pixeldrain, Cloudflare R2)
  // This bypasses Vercel proxy execution limits, eliminates proxy latency, and provides direct CDN speed
  if (!referer && (url.includes('pixeldrain.com/api/file/') || url.includes('cloudflarestorage.com'))) {
    return Response.redirect(url, 302);
  }

  const range = req.headers.get('range') || undefined;
  const headers: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Encoding': 'identity', // Ensure uncompressed byte stream for accurate media ranges
    'Connection': 'keep-alive',
  };
  if (referer) headers.Referer = referer;
  if (range) headers.Range = range;

  // Use AbortController with 55s timeout to prevent unhandled Vercel worker termination
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 55000);

  try {
    const upstream = await fetch(url, {
      headers,
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const resHeaders = new Headers();
    
    // Copy important streaming headers
    const pass = [
      'content-length',
      'accept-ranges',
      'content-range',
      'cache-control',
      'expires',
      'last-modified',
      'etag',
      'age',
    ];
    pass.forEach(k => {
      const v = upstream.headers.get(k);
      if (v) resHeaders.set(k, v);
    });

    // Determine correct media MIME type to prevent browser video decoder pipeline failures
    const detectedType = detectContentType(url, upstream.headers.get('content-type'));
    resHeaders.set('content-type', detectedType);

    // Always declare byte range capability for seeking support
    if (!resHeaders.get('accept-ranges')) resHeaders.set('accept-ranges', 'bytes');
    resHeaders.set('cache-control', 'no-store, no-cache, must-revalidate');
    resHeaders.set('X-Accel-Buffering', 'no');
    
    // Full CORS headers for player integration
    resHeaders.set('Access-Control-Allow-Origin', '*');
    resHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    resHeaders.set('Access-Control-Allow-Headers', 'Range, Content-Type, Accept');
    resHeaders.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, Content-Type');

    // Add download headers if requested
    if (isDownload) {
      let filename = 'video-download';
      try {
        const urlPath = new URL(url).pathname;
        const match = urlPath.match(/\/([^\/]+\.(mp4|mkv|avi|webm|m4v))$/i);
        if (match) {
          filename = match[1];
        } else {
          filename = `video.${detectedType.includes('matroska') ? 'mkv' : 'mp4'}`;
        }
      } catch {
        filename = 'video.mp4';
      }
      resHeaders.set('Content-Disposition', `attachment; filename="${filename}"`);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: resHeaders,
    });
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error('[PROXY] Error fetching upstream:', error?.message);
    return new Response(JSON.stringify({ 
      error: 'Upstream video streaming error', 
      message: error?.message || 'Failed to stream media from source' 
    }), {
      status: error?.name === 'AbortError' ? 504 : 502,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type, Accept',
      'Access-Control-Max-Age': '86400',
    }
  });
}
