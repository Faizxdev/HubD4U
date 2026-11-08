import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

// Convert SRT to VTT format with proper parsing
function srtToVtt(srt: string): string {
  // Normalize line endings
  const normalized = srt
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
  
  // Split into blocks (separated by empty lines)
  const blocks = normalized.split(/\n\n+/);
  
  let vtt = 'WEBVTT\n\n';
  
  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length < 2) continue;
    
    // Find the timing line (contains " --> ")
    let timingLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(' --> ')) {
        timingLineIndex = i;
        break;
      }
    }
    
    if (timingLineIndex === -1) continue;
    
    // Get timing line and convert comma to dot for milliseconds
    const timingLine = lines[timingLineIndex]
      .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
    
    // Get subtitle text (everything after timing line)
    const textLines = lines.slice(timingLineIndex + 1).filter(l => l.trim());
    
    if (textLines.length === 0) continue;
    
    // Add cue to VTT
    vtt += `${timingLine}\n${textLines.join('\n')}\n\n`;
  }
  
  return vtt;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  
  if (!url || !/^https?:\/\//i.test(url)) {
    return new Response('Bad Request', { status: 400 });
  }

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'VLSub 0.10.2',
      'Accept': '*/*',
    };

    const response = await fetch(url, {
      headers,
      redirect: 'follow',
    });

    if (!response.ok) {
      return new Response('Failed to fetch subtitle', { status: response.status });
    }

    let text = await response.text();
    
    // Check if it's already VTT format
    if (!text.trim().startsWith('WEBVTT')) {
      text = srtToVtt(text);
    }

    return new Response(text, {
      status: 200,
      headers: {
        'Content-Type': 'text/vtt; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error: any) {
    console.error('[SUBTITLE] Error:', error.message);
    return new Response('Failed to fetch subtitle', { status: 502 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
