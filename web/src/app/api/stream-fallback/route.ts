import {NextRequest} from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel Pro plan limit

// Multiple user agents to try
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

export async function GET(req: NextRequest) {
  try {
    const {searchParams} = new URL(req.url);
    const url = searchParams.get('url') || searchParams.get('link') || '';
    const referer = searchParams.get('referer') || undefined;
    
    console.log(`[STREAM-FALLBACK] Processing URL: ${url}`);
    
    if (!url) {
      return new Response(JSON.stringify({
        error: 'URL parameter required',
        message: 'Please provide a url or link parameter'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!/^https?:\/\//i.test(url)) {
      return new Response(JSON.stringify({
        error: 'Invalid URL',
        message: 'URL must be a valid HTTP/HTTPS link'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Resolve GoFile landing page URLs into direct CDN download links
    if (url.includes('gofile.io/d/')) {
      const id = url.split('/d/')[1]?.split('?')[0];
      if (id) {
        try {
          const { gofileExtracter } = await import('@/server/extractors/gofile');
          const gf = await gofileExtracter(id);
          if (gf?.link) {
            return Response.redirect(gf.link, 302);
          }
        } catch {}
      }
    }

    // Handle range requests for seeking
    const rangeHeader = req.headers.get('range');

    // Try multiple approaches to stream the content
    for (let i = 0; i < USER_AGENTS.length; i++) {
      const userAgent = USER_AGENTS[i];
      console.log(`[STREAM-FALLBACK] Attempt ${i + 1} with user agent: ${userAgent.substring(0, 50)}...`);
      
      try {
        const requestHeaders: Record<string, string> = {
          'User-Agent': userAgent,
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'identity',
          'Connection': 'keep-alive',
        };
        
        if (referer) {
          requestHeaders['Referer'] = referer;
        }
        
        if (rangeHeader) {
          requestHeaders['Range'] = rangeHeader;
        }

        const response = await fetch(url, {
          headers: requestHeaders,
          redirect: 'follow',
        });

        const cType = response.headers.get('content-type') || '';
        // Only return if it's actual binary/media data, NOT an HTML webpage
        if ((response.ok || response.status === 206) && !cType.includes('text/html')) {
          console.log(`[STREAM-FALLBACK] Success with attempt ${i + 1}, status: ${response.status}`);
          return streamResponse(response, url, rangeHeader);
        }
        
        console.log(`[STREAM-FALLBACK] Attempt ${i + 1} failed with status: ${response.status}`);
      } catch (error: any) {
        console.warn(`[STREAM-FALLBACK] Attempt ${i + 1} error:`, error.message);
      }
    }

    // If all direct attempts fail, try to extract video URLs from the page
    console.log(`[STREAM-FALLBACK] All direct attempts failed, trying URL extraction`);
    
    try {
      const pageResponse = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENTS[0],
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        }
      });

      if (pageResponse.ok) {
        const htmlContent = await pageResponse.text();
        const extractedUrls = extractVideoUrlsFromHTML(htmlContent, url);
        
        if (extractedUrls.length > 0) {
          console.log(`[STREAM-FALLBACK] Found ${extractedUrls.length} video URLs`);
          
          // Try to stream the first extracted URL
          for (const videoUrl of extractedUrls.slice(0, 3)) {
            console.log(`[STREAM-FALLBACK] Trying extracted URL: ${videoUrl}`);
            
            try {
              const videoResponse = await fetch(videoUrl, {
                headers: {
                  'User-Agent': USER_AGENTS[0],
                  'Accept': '*/*',
                  'Referer': url,
                },
                redirect: 'follow',
              });

              if (videoResponse.ok || videoResponse.status === 206) {
                console.log(`[STREAM-FALLBACK] Successfully streaming extracted URL`);
                return streamResponse(videoResponse, videoUrl, rangeHeader);
              }
            } catch (videoError: any) {
              console.warn(`[STREAM-FALLBACK] Failed to stream extracted URL:`, videoError.message);
            }
          }

          // Return extracted URLs as JSON if streaming failed
          return new Response(JSON.stringify({
            success: false,
            method: 'url-extraction',
            data: extractedUrls.map(u => ({
              server: 'Extracted',
              link: u,
              type: u.split('.').pop()?.toLowerCase() || 'video'
            })),
            originalUrl: url,
            note: 'Direct streaming failed. These URLs were extracted from the page.'
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    } catch (extractionError: any) {
      console.warn(`[STREAM-FALLBACK] URL extraction failed:`, extractionError.message);
    }

    // Final fallback - return error
    return new Response(JSON.stringify({
      error: 'Streaming failed',
      message: 'Unable to stream the content after multiple attempts',
      suggestions: [
        'The content may be protected by Cloudflare or similar services',
        'Try accessing the URL manually in a browser',
        'Check if the video requires authentication',
        'Try a different video source or provider'
      ],
      originalUrl: url
    }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error(`[STREAM-FALLBACK] General error:`, error);
    return new Response(JSON.stringify({
      error: 'Streaming processing failed',
      message: error.message || 'An unexpected error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function streamResponse(response: Response, originalUrl: string, rangeHeader: string | null) {
  let contentType = response.headers.get('content-type') || '';
  if (!contentType || contentType === 'application/octet-stream' || contentType === 'text/plain') {
    const clean = originalUrl.split('?')[0].toLowerCase();
    if (clean.endsWith('.mp4') || clean.endsWith('.m4v')) contentType = 'video/mp4';
    else if (clean.endsWith('.m3u8')) contentType = 'application/vnd.apple.mpegurl';
    else if (clean.endsWith('.webm')) contentType = 'video/webm';
    else if (clean.endsWith('.mkv')) contentType = 'video/x-matroska';
    else contentType = 'video/mp4';
  }
  const contentLength = response.headers.get('content-length');
  const contentRange = response.headers.get('content-range');
  const acceptRanges = response.headers.get('accept-ranges');
  
  console.log(`[STREAM-FALLBACK] Streaming: ${contentType}, Length: ${contentLength}, Range: ${contentRange}`);
  
  const headers = new Headers({
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Content-Type, Accept',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, Content-Type',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'X-Accel-Buffering': 'no',
  });

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
}

function extractVideoUrlsFromHTML(html: string, baseUrl: string): string[] {
  const videoUrls: string[] = [];
  
  try {
    // Video source tags
    const sourceMatches = html.matchAll(/<source[^>]+src=["']([^"']+)["'][^>]*>/gi);
    for (const match of sourceMatches) {
      const url = match[1];
      if (url && !url.startsWith('data:')) {
        videoUrls.push(url.startsWith('http') ? url : new URL(url, baseUrl).href);
      }
    }

    // Video tags with src
    const videoMatches = html.matchAll(/<video[^>]+src=["']([^"']+)["'][^>]*>/gi);
    for (const match of videoMatches) {
      const url = match[1];
      if (url && !url.startsWith('data:')) {
        videoUrls.push(url.startsWith('http') ? url : new URL(url, baseUrl).href);
      }
    }

    // Direct video file URLs
    const fileMatches = html.matchAll(/https?:\/\/[^\s"'<>]+\.(?:mp4|m3u8|mkv|webm|m4v|ts)/gi);
    for (const match of fileMatches) {
      if (!videoUrls.includes(match[0])) {
        videoUrls.push(match[0]);
      }
    }

    // Iframe embeds
    const iframeMatches = html.matchAll(/<iframe[^>]+src=["']([^"']+)["'][^>]*>/gi);
    for (const match of iframeMatches) {
      const url = match[1];
      if (url && !url.startsWith('data:') && !url.includes('google') && !url.includes('facebook')) {
        videoUrls.push(url.startsWith('http') ? url : new URL(url, baseUrl).href);
      }
    }

  } catch (error: any) {
    console.warn(`[STREAM-FALLBACK] HTML parsing error:`, error.message);
  }

  return [...new Set(videoUrls)];
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
