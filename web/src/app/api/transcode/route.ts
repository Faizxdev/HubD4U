import {NextRequest} from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel Pro plan limit

// Vercel-compatible transcode route - no FFmpeg, pure streaming
export async function GET(req: NextRequest) {
  const {searchParams} = new URL(req.url);
  const url = searchParams.get('url') || searchParams.get('link') || '';
  const referer = searchParams.get('referer') || undefined;
  
  if (!url || !/^https?:\/\//i.test(url)) {
    return new Response(JSON.stringify({
      error: 'Bad Request: Invalid URL',
      message: 'Please provide a valid url or link parameter',
      suggestions: [
        'Ensure the URL starts with http:// or https://',
        'Check that the URL is properly encoded',
        'Verify the video source is accessible'
      ]
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  console.log(`[TRANSCODE] Processing URL: ${url}`);

  // Check if this is a browser-compatible format
  const lowerUrl = url.toLowerCase();
  const isBrowserCompatible = 
    lowerUrl.includes('.mp4') || 
    lowerUrl.includes('.webm') || 
    lowerUrl.includes('.m3u8') ||
    lowerUrl.includes('.m4v') ||
    lowerUrl.includes('.ogg');

  try {
    // For browser-compatible formats, stream directly
    console.log(`[TRANSCODE] Attempting direct streaming (browser compatible: ${isBrowserCompatible})`);
    
    const requestHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'identity', // Don't compress for streaming
      'Connection': 'keep-alive',
    };
    
    if (referer) {
      requestHeaders['Referer'] = referer;
    }
    
    // Handle range requests for seeking support
    const rangeHeader = req.headers.get('range');
    if (rangeHeader) {
      requestHeaders['Range'] = rangeHeader;
    }

    const response = await fetch(url, {
      headers: requestHeaders,
      redirect: 'follow',
    });

    if (!response.ok && response.status !== 206) {
      console.log(`[TRANSCODE] Direct streaming failed (${response.status}), redirecting to fallback`);
      
      const fallbackUrl = `/api/stream-fallback?url=${encodeURIComponent(url)}${referer ? `&referer=${encodeURIComponent(referer)}` : ''}`;
      
      return new Response(null, {
        status: 307,
        headers: {
          'Location': fallbackUrl,
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Stream the content directly
    console.log(`[TRANSCODE] Direct streaming succeeded, status: ${response.status}`);
    
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = response.headers.get('content-length');
    const contentRange = response.headers.get('content-range');
    const acceptRanges = response.headers.get('accept-ranges');
    
    console.log(`[TRANSCODE] Content-Type: ${contentType}, Length: ${contentLength}`);

    const headers = new Headers({
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Accel-Buffering': 'no',
    });

    // Copy important headers for video playback
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }
    if (contentRange) {
      headers.set('Content-Range', contentRange);
    }
    if (acceptRanges) {
      headers.set('Accept-Ranges', acceptRanges);
    } else {
      headers.set('Accept-Ranges', 'bytes');
    }

    // Copy other useful headers
    const usefulHeaders = ['last-modified', 'etag'];
    usefulHeaders.forEach(header => {
      const value = response.headers.get(header);
      if (value) {
        headers.set(header, value);
      }
    });

    return new Response(response.body, {
      status: response.status,
      headers
    });

  } catch (error: any) {
    console.error('[TRANSCODE] Error:', error);
    
    // Redirect to fallback on error
    const fallbackUrl = `/api/stream-fallback?url=${encodeURIComponent(url)}${referer ? `&referer=${encodeURIComponent(referer)}` : ''}`;
    
    return new Response(null, {
      status: 307,
      headers: {
        'Location': fallbackUrl,
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(req: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
      'Access-Control-Max-Age': '86400',
    }
  });
}


