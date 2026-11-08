import {NextRequest} from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL;
    const platform = process.platform;
    const nodeVersion = process.version;
    const environment = process.env.NODE_ENV;
    
    return new Response(JSON.stringify({
      available: false,
      reason: 'Vercel serverless environment - FFmpeg not supported',
      message: 'Video transcoding is not available. Use direct streaming instead.',
      alternatives: {
        proxy: {
          route: '/api/proxy',
          description: 'Direct video proxy with CORS support',
          usage: '/api/proxy?url=VIDEO_URL&referer=OPTIONAL_REFERER'
        },
        streamFallback: {
          route: '/api/stream-fallback',
          description: 'Fallback streaming with multiple retry strategies',
          usage: '/api/stream-fallback?url=VIDEO_URL&referer=OPTIONAL_REFERER'
        },
        transcode: {
          route: '/api/transcode',
          description: 'Direct streaming (redirects to fallback if needed)',
          usage: '/api/transcode?url=VIDEO_URL&referer=OPTIONAL_REFERER'
        }
      },
      supportedFormats: {
        directPlay: ['mp4', 'webm', 'm4v', 'ogg'],
        hlsStreaming: ['m3u8'],
        proxyStreaming: ['mkv', 'avi', 'mov', 'wmv', 'flv']
      },
      environment: {
        platform,
        nodeVersion,
        environment,
        vercel: isVercel,
        region: process.env.VERCEL_REGION || 'unknown'
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    return new Response(JSON.stringify({
      error: 'Test failed',
      message: error.message,
      available: false
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
