import path from 'path';
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // Ensure output file tracing resolves from the web app directory in this workspace
  outputFileTracingRoot: path.join(__dirname, '..'),
  
  // Vercel-specific optimizations
  experimental: {
    // Enable streaming responses
    serverActions: {
      bodySizeLimit: '10mb'
    }
  },
  
  // Optimize for Vercel
  poweredByHeader: false,
  
  // Vercel-specific headers for streaming
  async headers() {
    return [
      {
        source: '/api/transcode/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate'
          },
          {
            key: 'X-Accel-Buffering',
            value: 'no'
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          }
        ]
      },
      {
        source: '/api/stream-fallback/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate'
          },
          {
            key: 'X-Accel-Buffering',
            value: 'no'
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          }
        ]
      }
    ];
  }
};

export default nextConfig;
