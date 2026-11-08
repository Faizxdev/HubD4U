import { NextRequest, NextResponse } from 'next/server';

// API to stream video with a specific audio track selected
// This works by remuxing the video on-the-fly to select the desired audio track

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  const audioTrack = request.nextUrl.searchParams.get('track') || '0';
  const range = request.headers.get('range');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter required' }, { status: 400 });
  }

  try {
    const decodedUrl = decodeURIComponent(url);
    
    // For now, we'll proxy the stream and let the client handle it
    // True audio track switching requires FFmpeg transcoding which is heavy
    
    // Fetch the video with range support
    const headers: HeadersInit = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };
    
    if (range) {
      headers['Range'] = range;
    }

    const response = await fetch(decodedUrl, { headers });
    
    if (!response.ok && response.status !== 206) {
      return NextResponse.json({ error: 'Failed to fetch video' }, { status: response.status });
    }

    // Get response headers
    const contentType = response.headers.get('content-type') || 'video/x-matroska';
    const contentLength = response.headers.get('content-length');
    const contentRange = response.headers.get('content-range');
    const acceptRanges = response.headers.get('accept-ranges');

    // Create response headers
    const responseHeaders: HeadersInit = {
      'Content-Type': contentType,
      'Accept-Ranges': acceptRanges || 'bytes',
      'Access-Control-Allow-Origin': '*',
      // Add custom header to indicate selected audio track
      'X-Audio-Track': audioTrack,
    };

    if (contentLength) {
      responseHeaders['Content-Length'] = contentLength;
    }
    if (contentRange) {
      responseHeaders['Content-Range'] = contentRange;
    }

    // Stream the response
    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('[STREAM-AUDIO] Error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to stream video',
    }, { status: 500 });
  }
}
