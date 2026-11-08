import {NextRequest} from 'next/server';

export const dynamic = 'force-dynamic';

interface AnalysisResult {
  url: string;
  status: number;
  statusText: string;
  headers: {
    'content-type': string;
    'content-length': string | null;
    'accept-ranges': string | null;
    'last-modified': string | null;
    'etag': string | null;
  };
  analysis: {
    isVideoContent: boolean | RegExpMatchArray | null;
    contentTypeAnalysis: string;
    contentLengthAnalysis: string;
    acceptRangesAnalysis: string;
    lastModifiedAnalysis: string;
    etagAnalysis: string;
    streamingTest?: string;
    firstChunkSize?: number;
    streamingError?: string;
  };
  recommendations: string[];
}

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const {searchParams} = new URL(req.url);
    const testUrl = searchParams.get('url');
    
    if (!testUrl) {
      return new Response(JSON.stringify({
        error: 'Test URL required',
        message: 'Please provide a url parameter to test',
        example: '/api/stream-fallback/test?url=https://example.com/video.mp4'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`[STREAM-FALLBACK-TEST] Testing URL: ${testUrl}`);

    try {
      // Test basic fetch
      const response = await fetch(testUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
        }
      });

      const contentType = response.headers.get('content-type') || '';
      const contentLength = response.headers.get('content-length');
      const acceptRanges = response.headers.get('accept-ranges');
      const lastModified = response.headers.get('last-modified');
      const etag = response.headers.get('etag');
      
      console.log(`[STREAM-FALLBACK-TEST] Response status: ${response.status}`);
      console.log(`[STREAM-FALLBACK-TEST] Content-Type: ${contentType}`);

      const isVideoContent = contentType.includes('video/') || 
                            contentType.includes('application/octet-stream') ||
                            contentType.includes('audio/') ||
                            !!testUrl.match(/\.(mp4|m3u8|mkv|avi|mov|wmv|flv|webm|ts|m4v)$/i);

      const analysis: AnalysisResult = {
        url: testUrl,
        status: response.status,
        statusText: response.statusText,
        headers: {
          'content-type': contentType,
          'content-length': contentLength,
          'accept-ranges': acceptRanges,
          'last-modified': lastModified,
          'etag': etag
        },
        analysis: {
          isVideoContent: isVideoContent,
          contentTypeAnalysis: contentType ? 'Present' : 'Missing',
          contentLengthAnalysis: contentLength ? 'Present' : 'Missing',
          acceptRangesAnalysis: acceptRanges ? 'Present' : 'Missing',
          lastModifiedAnalysis: lastModified ? 'Present' : 'Missing',
          etagAnalysis: etag ? 'Present' : 'Missing'
        },
        recommendations: []
      };

      if (!response.ok) {
        analysis.recommendations.push(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      if (!contentType) {
        analysis.recommendations.push('Content-Type header is missing');
      }
      
      if (!isVideoContent) {
        analysis.recommendations.push('Content does not appear to be video');
      }
      
      if (!acceptRanges) {
        analysis.recommendations.push('Accept-Ranges header is missing - seeking may not work');
      }

      // Test streaming if it looks like video
      if (response.ok && isVideoContent) {
        try {
          const streamResponse = await fetch(testUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': '*/*',
              'Range': 'bytes=0-1023'
            }
          });

          if (streamResponse.ok || streamResponse.status === 206) {
            const chunk = await streamResponse.arrayBuffer();
            analysis.analysis.streamingTest = 'Success';
            analysis.analysis.firstChunkSize = chunk.byteLength;
            analysis.recommendations.push('Streaming test passed');
          } else {
            analysis.analysis.streamingTest = 'Failed';
            analysis.recommendations.push(`Streaming test failed: ${streamResponse.status}`);
          }
        } catch (streamError: any) {
          analysis.analysis.streamingTest = 'Error';
          analysis.analysis.streamingError = streamError.message;
        }
      }

      return new Response(JSON.stringify(analysis, null, 2), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (fetchError: any) {
      return new Response(JSON.stringify({
        error: 'Fetch test failed',
        message: fetchError.message,
        url: testUrl,
        suggestions: [
          'URL may be protected by Cloudflare',
          'Try accessing manually in browser',
          'Content may require authentication'
        ]
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error: any) {
    return new Response(JSON.stringify({
      error: 'Test processing failed',
      message: error.message || 'An unexpected error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
