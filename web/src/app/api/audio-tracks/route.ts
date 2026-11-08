import { NextRequest, NextResponse } from 'next/server';

// API to detect audio tracks from a video stream using FFprobe
// This extracts metadata about audio tracks embedded in MKV/MP4 files

interface AudioTrack {
  index: number;
  codec: string;
  language: string;
  title: string;
  channels: number;
  bitrate?: number;
  default: boolean;
}

interface FFprobeStream {
  index: number;
  codec_type: string;
  codec_name: string;
  channels?: number;
  bit_rate?: string;
  tags?: {
    language?: string;
    title?: string;
    handler_name?: string;
  };
  disposition?: {
    default?: number;
  };
}

interface FFprobeResult {
  streams: FFprobeStream[];
  format?: {
    filename?: string;
    duration?: string;
  };
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return NextResponse.json({ error: 'URL parameter required' }, { status: 400 });
  }

  try {
    // Decode the URL
    const decodedUrl = decodeURIComponent(url);
    
    // Try to get audio track info using FFprobe via a public API or local ffprobe
    // Since we can't run ffprobe directly in serverless, we'll parse the URL for hints
    // and use a fallback approach
    
    const audioTracks = await detectAudioTracks(decodedUrl);
    
    return NextResponse.json({
      success: true,
      tracks: audioTracks,
      url: decodedUrl,
    });
  } catch (error: any) {
    console.error('[AUDIO-TRACKS] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to detect audio tracks',
      tracks: [],
    }, { status: 500 });
  }
}

async function detectAudioTracks(url: string): Promise<AudioTrack[]> {
  // Method 1: Instant zero-latency filename & URL hint parsing (< 1ms)
  // Media releases (Vega, HubCloud, etc.) almost always encode dual/multi-audio tracks in the filename
  const filenameTracks = parseAudioFromFilename(url);
  if (filenameTracks.length > 0) {
    return filenameTracks;
  }

  // Method 2: If filename hints were not present and host is fast/direct, try quick header check
  const isSlowFilehost = /megaup|gofile|rapidgator|1fichier|dropgalaxy|filefactory|katfile/i.test(url);
  if (!isSlowFilehost) {
    try {
      const ffprobeResult = await fetchFFprobeData(url);
      if (ffprobeResult && ffprobeResult.streams) {
        const audioStreams = ffprobeResult.streams.filter(
          (s: FFprobeStream) => s.codec_type === 'audio'
        );
        
        if (audioStreams.length > 0) {
          return audioStreams.map((stream: FFprobeStream, i: number) => ({
            index: i,
            codec: stream.codec_name || 'unknown',
            language: stream.tags?.language || stream.tags?.handler_name || 'und',
            title: stream.tags?.title || `Track ${i + 1}`,
            channels: stream.channels || 2,
            bitrate: stream.bit_rate ? parseInt(stream.bit_rate) : undefined,
            default: stream.disposition?.default === 1,
          }));
        }
      }
    } catch {}
  }

  // Method 3: Safe fallback single track
  return [{
    index: 0,
    codec: 'aac',
    language: 'und',
    title: 'Default Audio',
    channels: 2,
    default: true,
  }];
}

async function fetchFFprobeData(url: string): Promise<FFprobeResult | null> {
  // Try to fetch just the header/metadata portion of the file with strict 1.5s timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    // Request only first 128KB to get metadata quickly
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Range': 'bytes=0-131072',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok && response.status !== 206) {
      return null;
    }

    // Get the content as array buffer
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Parse MKV/WebM EBML header for track info
    if (bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3) {
      // This is an MKV/WebM file (EBML header)
      return parseMkvTracks(bytes);
    }

    // Parse MP4/M4V for track info
    if (isMP4(bytes)) {
      return parseMp4Tracks(bytes);
    }

    return null;
  } catch (e: any) {
    if (e?.name !== 'AbortError') {
      console.log('[AUDIO-TRACKS] Header fetch skipped:', e?.message || e);
    }
    return null;
  }
}

function isMP4(bytes: Uint8Array): boolean {
  // Check for ftyp box
  if (bytes.length < 8) return false;
  const ftyp = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
  return ftyp === 'ftyp';
}

function parseMkvTracks(bytes: Uint8Array): FFprobeResult | null {
  // MKV/WebM EBML parsing for audio tracks
  const tracks: FFprobeStream[] = [];
  
  try {
    const content = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    
    // Look for audio codec signatures and their associated language tags
    const audioCodecs = ['A_AAC', 'A_AC3', 'A_EAC3', 'A_DTS', 'A_FLAC', 'A_OPUS', 'A_VORBIS', 'A_MP3', 'A_TRUEHD', 'A_PCM'];
    
    // Language code to name mapping
    const langNames: Record<string, string> = {
      'hin': 'Hindi', 'hindi': 'Hindi', 'hi': 'Hindi',
      'eng': 'English', 'english': 'English', 'en': 'English',
      'jpn': 'Japanese', 'japanese': 'Japanese', 'ja': 'Japanese', 'jap': 'Japanese',
      'chi': 'Chinese', 'chinese': 'Chinese', 'zh': 'Chinese', 'zho': 'Chinese',
      'kor': 'Korean', 'korean': 'Korean', 'ko': 'Korean',
      'tam': 'Tamil', 'tamil': 'Tamil', 'ta': 'Tamil',
      'tel': 'Telugu', 'telugu': 'Telugu', 'te': 'Telugu',
      'spa': 'Spanish', 'spanish': 'Spanish', 'es': 'Spanish',
      'fra': 'French', 'french': 'French', 'fr': 'French',
      'deu': 'German', 'german': 'German', 'de': 'German', 'ger': 'German',
      'por': 'Portuguese', 'portuguese': 'Portuguese', 'pt': 'Portuguese',
      'rus': 'Russian', 'russian': 'Russian', 'ru': 'Russian',
      'ara': 'Arabic', 'arabic': 'Arabic', 'ar': 'Arabic',
      'ita': 'Italian', 'italian': 'Italian', 'it': 'Italian',
      'und': 'Unknown', 'mul': 'Multiple',
    };
    
    // Find all audio tracks by looking for codec IDs
    const trackInfos: { codec: string; position: number }[] = [];
    
    for (const codec of audioCodecs) {
      let idx = 0;
      while ((idx = content.indexOf(codec, idx)) !== -1) {
        trackInfos.push({ codec, position: idx });
        idx += codec.length;
      }
    }
    
    // Sort by position to maintain track order
    trackInfos.sort((a, b) => a.position - b.position);
    
    // For each track, try to find language info nearby
    for (let i = 0; i < trackInfos.length; i++) {
      const { codec, position } = trackInfos[i];
      
      // Search in a window around the codec position for language tags
      const searchStart = Math.max(0, position - 500);
      const searchEnd = Math.min(content.length, position + 500);
      const nearby = content.substring(searchStart, searchEnd);
      
      // Look for 3-letter language codes
      let language = 'und';
      let title = '';
      
      // Common language patterns in MKV
      const langPatterns = [
        /\x22(hin|eng|jpn|chi|kor|tam|tel|spa|fra|deu|por|rus|ara|ita|und|mul)\x22/i,
        /\b(hindi|english|japanese|chinese|korean|tamil|telugu|spanish|french|german|portuguese|russian|arabic|italian)\b/i,
        /Language[:\s]*([a-z]{2,3})/i,
      ];
      
      for (const pattern of langPatterns) {
        const match = nearby.match(pattern);
        if (match) {
          const code = match[1].toLowerCase();
          language = langNames[code] ? code : 'und';
          break;
        }
      }
      
      // Try to find track title/name
      const titleMatch = nearby.match(/Name[:\s]*([^\x00-\x1f]{2,50})/i) || 
                         nearby.match(/Title[:\s]*([^\x00-\x1f]{2,50})/i);
      if (titleMatch) {
        title = titleMatch[1].trim();
      }
      
      // Get codec name
      const codecName = codec.replace('A_', '').toLowerCase();
      
      tracks.push({
        index: i,
        codec_type: 'audio',
        codec_name: codecName,
        channels: 2,
        tags: {
          language: language,
          title: title || langNames[language] || `Track ${i + 1}`,
        },
        disposition: { default: i === 0 ? 1 : 0 },
      });
    }
    
    if (tracks.length > 0) {
      console.log(`[AUDIO-TRACKS] Parsed ${tracks.length} audio tracks from MKV`);
      return { streams: tracks };
    }
  } catch (e) {
    console.log('[AUDIO-TRACKS] MKV parsing error:', e);
  }
  
  return null;
}

function parseMp4Tracks(bytes: Uint8Array): FFprobeResult | null {
  // Simplified MP4 parsing
  const tracks: FFprobeStream[] = [];
  
  try {
    const content = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    
    // Count 'soun' (sound) track handlers
    let audioCount = 0;
    let idx = 0;
    while ((idx = content.indexOf('soun', idx)) !== -1) {
      audioCount++;
      idx += 4;
    }
    
    // Also check for 'mp4a' audio codec
    idx = 0;
    while ((idx = content.indexOf('mp4a', idx)) !== -1) {
      if (audioCount === 0) audioCount++;
      idx += 4;
    }
    
    for (let i = 0; i < audioCount; i++) {
      tracks.push({
        index: i,
        codec_type: 'audio',
        codec_name: 'aac',
        channels: 2,
        tags: {
          language: 'und',
          title: `Audio Track ${i + 1}`,
        },
        disposition: { default: i === 0 ? 1 : 0 },
      });
    }
    
    if (tracks.length > 0) {
      return { streams: tracks };
    }
  } catch (e) {
    console.log('[AUDIO-TRACKS] MP4 parsing error:', e);
  }
  
  return null;
}

function parseAudioFromFilename(url: string): AudioTrack[] {
  const tracks: AudioTrack[] = [];
  
  try {
    // Decode URL and get filename
    const decoded = decodeURIComponent(decodeURIComponent(url));
    const filename = decoded.split('/').pop() || decoded;
    
    // Language patterns
    const languageMap: Record<string, string> = {
      'hindi': 'hin', 'hin': 'hin', 'hi': 'hin',
      'english': 'eng', 'eng': 'eng', 'en': 'eng',
      'japanese': 'jpn', 'jpn': 'jpn', 'jap': 'jpn', 'ja': 'jpn',
      'chinese': 'chi', 'chi': 'chi', 'zh': 'chi', 'mandarin': 'chi', 'cantonese': 'chi',
      'korean': 'kor', 'kor': 'kor', 'ko': 'kor',
      'tamil': 'tam', 'tam': 'tam', 'ta': 'tam',
      'telugu': 'tel', 'tel': 'tel', 'te': 'tel',
      'spanish': 'spa', 'spa': 'spa', 'es': 'spa',
      'french': 'fra', 'fra': 'fra', 'fr': 'fra',
      'german': 'deu', 'deu': 'deu', 'ger': 'deu', 'de': 'deu',
      'original': 'org', 'org': 'org',
    };
    
    const detectedLanguages: string[] = [];
    
    // Check for multi-audio indicators
    const hasMultiAudio = /multi[\s\-_]?audio/i.test(filename);
    const hasDualAudio = /dual[\s\-_]?audio/i.test(filename);
    
    // Detect specific languages
    for (const [key, code] of Object.entries(languageMap)) {
      const pattern = new RegExp(`\\b${key}\\b`, 'i');
      if (pattern.test(filename) && !detectedLanguages.includes(code)) {
        detectedLanguages.push(code);
      }
    }
    
    // If multi/dual audio but no specific languages detected
    if ((hasMultiAudio || hasDualAudio) && detectedLanguages.length === 0) {
      if (hasDualAudio) {
        detectedLanguages.push('track1', 'track2');
      } else {
        detectedLanguages.push('track1', 'track2', 'track3');
      }
    }
    
    // Create track entries
    for (let i = 0; i < detectedLanguages.length; i++) {
      const lang = detectedLanguages[i];
      tracks.push({
        index: i,
        codec: 'aac',
        language: lang,
        title: getLanguageName(lang),
        channels: 2,
        default: i === 0,
      });
    }
  } catch (e) {
    console.log('[AUDIO-TRACKS] Filename parsing error:', e);
  }
  
  return tracks;
}

function getLanguageName(code: string): string {
  const names: Record<string, string> = {
    'hin': 'Hindi',
    'eng': 'English',
    'jpn': 'Japanese',
    'chi': 'Chinese',
    'kor': 'Korean',
    'tam': 'Tamil',
    'tel': 'Telugu',
    'spa': 'Spanish',
    'fra': 'French',
    'deu': 'German',
    'org': 'Original',
    'und': 'Unknown',
    'track1': 'Track 1',
    'track2': 'Track 2',
    'track3': 'Track 3',
  };
  return names[code] || code.toUpperCase();
}
