import {NextRequest} from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Check if we're in Vercel environment
    const isVercel = !!process.env.VERCEL;
    const environment = process.env.NODE_ENV || 'unknown';
    const region = process.env.VERCEL_REGION || 'unknown';
    
    // Check environment variables
    const envVars = {
      NODE_ENV: environment,
      VERCEL: isVercel,
      VERCEL_REGION: region,
    };
    
    // Test fetch capability
    let fetchStatus = 'unknown';
    try {
      const testResponse = await fetch('https://httpbin.org/get', { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      fetchStatus = testResponse.ok ? 'working' : `error-${testResponse.status}`;
    } catch (fetchError: any) {
      fetchStatus = `error: ${fetchError.message}`;
    }
    
    return new Response(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: envVars,
      capabilities: {
        fetch: fetchStatus,
        streaming: 'supported',
        transcoding: 'not-available (Vercel serverless)',
        ffmpeg: 'not-supported (use direct streaming instead)'
      },
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      routes: {
        proxy: '/api/proxy - Direct video proxy with CORS',
        transcode: '/api/transcode - Direct streaming (no FFmpeg)',
        streamFallback: '/api/stream-fallback - Fallback streaming with multiple attempts',
        stream: '/api/stream - Stream extraction from providers'
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    return new Response(JSON.stringify({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
