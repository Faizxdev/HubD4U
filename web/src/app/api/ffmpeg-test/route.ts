import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// FFmpeg is not supported on Vercel - this route now provides information about alternatives
export async function GET(req: NextRequest) {
  try {
    const isVercel = !!process.env.VERCEL;
    const platform = process.platform;
    const nodeVersion = process.version;
    const environment = process.env.NODE_ENV;
    
    return NextResponse.json({
      status: 'NOT_AVAILABLE',
      timestamp: new Date().toISOString(),
      message: 'FFmpeg is not supported in Vercel serverless environment',
      environment: {
        NODE_ENV: environment,
        VERCEL: isVercel,
        VERCEL_REGION: process.env.VERCEL_REGION || 'unknown',
        platform,
        arch: process.arch,
        nodeVersion
      },
      alternatives: {
        directStreaming: {
          description: 'Stream browser-compatible formats directly',
          route: '/api/proxy',
          supportedFormats: ['mp4', 'webm', 'm4v', 'ogg']
        },
        hlsStreaming: {
          description: 'HLS streams are handled client-side with hls.js',
          supportedFormats: ['m3u8']
        },
        fallbackStreaming: {
          description: 'Fallback route for problematic streams',
          route: '/api/stream-fallback'
        }
      },
      recommendations: [
        'Use /api/proxy for direct video streaming with CORS support',
        'Use /api/stream-fallback for streams that fail with proxy',
        'HLS streams (.m3u8) are handled automatically by the player',
        'MKV files can be streamed directly through the proxy',
        'For transcoding needs, consider external services like Cloudflare Stream'
      ]
    });
    
  } catch (error: any) {
    return NextResponse.json({
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
