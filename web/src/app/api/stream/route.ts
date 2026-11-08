import {NextRequest, NextResponse} from 'next/server';
import {fetchProviderModules, clearProviderCache} from '@/server/providerLoader';
import {executeModule} from '@/server/providerExecutor';
import {providerContext} from '@/server/providerContext';
import {getBaseUrl} from '@/server/getBaseUrl';

export const dynamic = 'force-dynamic';

// Helper function to generate alternative URL formats
async function generateAlternativeUrls(originalUrl: string): Promise<string[]> {
  try {
    const url = new URL(originalUrl);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    
    const alternatives = [
      `${url.origin}/watch/${lastPart}`,
      `${url.origin}/embed/${lastPart}`,
      `${url.origin}/stream/${lastPart}`,
      `${url.origin}/play/${lastPart}`,
      `${url.origin}/video/${lastPart}`,
      `${url.origin}/${lastPart}/watch`,
      `${url.origin}/${lastPart}/embed`,
      `${url.origin}/${lastPart}/stream`,
      `${url.origin}/${lastPart}/play`
    ];
    
    console.log(`[STREAM-API] Generated ${alternatives.length} alternative URLs for: ${originalUrl}`);
    return alternatives;
  } catch (error) {
    console.warn(`[STREAM-API] Failed to generate alternative URLs:`, error);
    return [];
  }
}

// Comprehensive extraction using all available extractors
async function tryComprehensiveExtraction(link: string, type: string, signal: AbortSignal) {
  const allStreams: any[] = [];
  
  try {
    console.log(`[STREAM-API] Starting comprehensive extraction for: ${link}`);
    
    // Add overall timeout for Vercel
    const extractionController = new AbortController();
    const extractionTimeout = setTimeout(() => extractionController.abort(), 25000); // 25 second timeout
    
    // Combine signals
    const combinedSignal = AbortSignal.any([signal, extractionController.signal]);
    
    // Import extractors directly to avoid circular dependencies
    const { hubcloudExtracter } = await import('@/server/extractors/hubcloud');
    const { gdFlixExtracter } = await import('@/server/extractors/gdflix');
    const { superVideoExtractor } = await import('@/server/extractors/superVideo');
    const { gofileExtracter } = await import('@/server/extractors/gofile');
    
    // Try hubcloudExtracter first (most reliable)
    try {
      console.log(`[STREAM-API] Trying hubcloudExtracter...`);
      const hubcloudResult = await hubcloudExtracter(link, combinedSignal);
      if (Array.isArray(hubcloudResult) && hubcloudResult.length > 0) {
        console.log(`[STREAM-API] hubcloudExtracter found ${hubcloudResult.length} streams`);
        allStreams.push(...hubcloudResult);
      }
    } catch (error: any) {
      console.warn(`[STREAM-API] hubcloudExtracter failed:`, error.message);
    }
    
    // Try gdFlixExtracter
    try {
      console.log(`[STREAM-API] Trying gdFlixExtracter...`);
      const gdFlixResult = await gdFlixExtracter(link, combinedSignal);
      if (Array.isArray(gdFlixResult) && gdFlixResult.length > 0) {
        console.log(`[STREAM-API] gdFlixExtracter found ${gdFlixResult.length} streams`);
        allStreams.push(...gdFlixResult);
      }
    } catch (error: any) {
      console.warn(`[STREAM-API] gdFlixExtracter failed:`, error.message);
    }
    
    // Try superVideoExtractor (needs content first)
    try {
      console.log(`[STREAM-API] Trying superVideoExtractor...`);
      const response = await fetch(link, { 
        signal: combinedSignal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      if (response.ok) {
        const content = await response.text();
        const superVideoResult = await superVideoExtractor(content);
        if (superVideoResult && typeof superVideoResult === 'string' && superVideoResult.length > 0) {
          console.log(`[STREAM-API] superVideoExtractor found stream:`, superVideoResult);
          allStreams.push({
            server: 'SuperVideo',
            link: superVideoResult,
            type: 'm3u8'
          });
        }
      }
    } catch (error: any) {
      console.warn(`[STREAM-API] superVideoExtractor failed:`, error.message);
    }
    
    // Try gofileExtracter (extract ID from URL)
    try {
      console.log(`[STREAM-API] Trying gofileExtracter...`);
      const url = new URL(link);
      const pathParts = url.pathname.split('/').filter(Boolean);
      const lastPart = pathParts[pathParts.length - 1];
      
      if (lastPart && lastPart.length > 5) { // Basic validation
        const gofileResult = await gofileExtracter(lastPart);
        if (gofileResult && gofileResult.link && gofileResult.link.length > 0) {
          console.log(`[STREAM-API] gofileExtracter found stream:`, gofileResult.link);
          allStreams.push({
            server: 'GoFile',
            link: gofileResult.link,
            type: 'mp4'
          });
        }
      }
    } catch (error: any) {
      console.warn(`[STREAM-API] gofileExtracter failed:`, error.message);
    }
    
    // Try direct content parsing as last resort
    try {
      console.log(`[STREAM-API] Trying direct content parsing...`);
      const response = await fetch(link, { 
        signal: combinedSignal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      if (response.ok) {
        const content = await response.text();
        const directStreams = await extractDirectStreams(content, link);
        if (directStreams.length > 0) {
          console.log(`[STREAM-API] Direct parsing found ${directStreams.length} streams`);
          allStreams.push(...directStreams);
        }
      }
    } catch (error: any) {
      console.warn(`[STREAM-API] Direct content parsing failed:`, error.message);
    }
    
    // NEW: Try to extract and process vcloud links from the content
    try {
      console.log(`[STREAM-API] Trying vcloud link extraction...`);
      const response = await fetch(link, { 
        signal: combinedSignal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      if (response.ok) {
        const content = await response.text();
        const vcloudStreams = await extractVcloudStreams(content, combinedSignal);
        if (vcloudStreams.length > 0) {
          console.log(`[STREAM-API] Vcloud extraction found ${vcloudStreams.length} streams`);
          allStreams.push(...vcloudStreams);
        }
      }
    } catch (error: any) {
      console.warn(`[STREAM-API] Vcloud extraction failed:`, error.message);
    }
    
    // NEW: Try to extract and process filebee links from the content
    try {
      console.log(`[STREAM-API] Trying filebee link extraction...`);
      const response = await fetch(link, { 
        signal: combinedSignal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      if (response.ok) {
        const content = await response.text();
        const filebeeStreams = await extractFilebeeStreams(content, combinedSignal);
        if (filebeeStreams.length > 0) {
          console.log(`[STREAM-API] Filebee extraction found ${filebeeStreams.length} streams`);
          allStreams.push(...filebeeStreams);
        }
      }
    } catch (error: any) {
      console.warn(`[STREAM-API] Filebee extraction failed:`, error.message);
    }
    
    clearTimeout(extractionTimeout);
    console.log(`[STREAM-API] Comprehensive extraction completed. Total streams found: ${allStreams.length}`);
    return allStreams;
    
  } catch (error: any) {
    console.error(`[STREAM-API] Comprehensive extraction error:`, error.message);
    return [];
  }
}

// Extract streams directly from HTML content
async function extractDirectStreams(content: string, baseUrl: string) {
  const streams: any[] = [];
  
  try {
    // Look for video elements
    const videoMatches = content.match(/<video[^>]*src=["']([^"']+)["'][^>]*>/gi);
    if (videoMatches) {
      videoMatches.forEach(match => {
        const srcMatch = match.match(/src=["']([^"']+)["']/);
        if (srcMatch && srcMatch[1]) {
          const link = srcMatch[1].startsWith('http') ? srcMatch[1] : new URL(srcMatch[1], baseUrl).href;
          streams.push({
            server: 'HTML5 Video',
            link,
            type: 'mp4'
          });
        }
      });
    }
    
    // Look for iframe embeds
    const iframeMatches = content.match(/<iframe[^>]*src=["']([^"']+)["'][^>]*>/gi);
    if (iframeMatches) {
      iframeMatches.forEach(match => {
        const srcMatch = match.match(/src=["']([^"']+)["']/);
        if (srcMatch && srcMatch[1]) {
          const link = srcMatch[1].startsWith('http') ? srcMatch[1] : new URL(srcMatch[1], baseUrl).href;
          streams.push({
            server: 'Embedded Player',
            link,
            type: 'iframe'
          });
        }
      });
    }
    
    // Look for common video file extensions
    const videoFileMatches = content.match(/https?:\/\/[^\s"']*\.(?:mp4|m3u8|mkv|avi|mov|wmv|flv|webm)/gi);
    if (videoFileMatches) {
      videoFileMatches.forEach(match => {
        streams.push({
          server: 'Direct Link',
          link: match,
          type: match.split('.').pop() || 'mp4'
        });
      });
    }
    
    // Look for common video hosting patterns
    const hostingPatterns = [
      /https?:\/\/[^\s"']*\.(?:cloudflare|fastly|bunny|streamable)\.com[^\s"']*/gi,
      /https?:\/\/[^\s"']*\.(?:youtube|vimeo|dailymotion)\.com[^\s"']*/gi
    ];
    
    hostingPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          streams.push({
            server: 'Video Hosting',
            link: match,
            type: 'embed'
          });
        });
      }
    });
    
  } catch (error: any) {
    console.warn(`[STREAM-API] Direct stream extraction error:`, error.message);
  }
  
  return streams;
}

// Extract and process vcloud links specifically
async function extractVcloudStreams(content: string, signal: AbortSignal) {
  const streams: any[] = [];
  
  try {
    // Look for vcloud.lol links
    const vcloudMatches = content.match(/https?:\/\/vcloud\.lol\/[^\s"']+/gi);
    if (vcloudMatches) {
      console.log(`[STREAM-API] Found ${vcloudMatches.length} vcloud links:`, vcloudMatches);
      
      // Limit to first 2 vcloud links to avoid timeout on Vercel
      const limitedVcloudLinks = vcloudMatches.slice(0, 2);
      
      for (const vcloudLink of limitedVcloudLinks) {
        try {
          // Add timeout for Vercel
          const vcloudController = new AbortController();
          const vcloudTimeout = setTimeout(() => vcloudController.abort(), 10000); // 10 second timeout
          
          // Try to fetch the vcloud page
          const response = await fetch(vcloudLink, { 
            signal: vcloudController.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          
          clearTimeout(vcloudTimeout);
          
          if (response.ok) {
            const vcloudContent = await response.text();
            
            // Look for direct video links in vcloud content
            const videoMatches = vcloudContent.match(/https?:\/\/[^\s"']*\.(?:mp4|m3u8|mkv|avi|mov|wmv|flv|webm)/gi);
            if (videoMatches) {
              videoMatches.forEach(match => {
                streams.push({
                  server: 'VCloud',
                  link: match,
                  type: match.split('.').pop() || 'mp4'
                });
              });
            }
            
            // Look for iframe embeds
            const iframeMatches = vcloudContent.match(/<iframe[^>]*src=["']([^"']+)["'][^>]*>/gi);
            if (iframeMatches) {
              iframeMatches.forEach(match => {
                const srcMatch = match.match(/src=["']([^"']+)["']/);
                if (srcMatch && srcMatch[1]) {
                  streams.push({
                    server: 'VCloud Embed',
                    link: srcMatch[1],
                    type: 'iframe'
                  });
                }
              });
            }
            
            // Look for video elements
            const videoElements = vcloudContent.match(/<video[^>]*src=["']([^"']+)["'][^>]*>/gi);
            if (videoElements) {
              videoElements.forEach(match => {
                const srcMatch = match.match(/src=["']([^"']+)["']/);
                if (srcMatch && srcMatch[1]) {
                  streams.push({
                    server: 'VCloud Video',
                    link: srcMatch[1],
                    type: 'mp4'
                  });
                }
              });
            }
          }
        } catch (error: any) {
          console.warn(`[STREAM-API] Failed to process vcloud link ${vcloudLink}:`, error.message);
        }
      }
    }
    
  } catch (error: any) {
    console.warn(`[STREAM-API] Vcloud extraction error:`, error.message);
  }
  
  return streams;
}

// Extract and process filebee links specifically
async function extractFilebeeStreams(content: string, signal: AbortSignal) {
  const streams: any[] = [];
  
  try {
    // Look for filebee.xyz links
    const filebeeMatches = content.match(/https?:\/\/filebee\.xyz\/[^\s"']+/gi);
    if (filebeeMatches) {
      console.log(`[STREAM-API] Found ${filebeeMatches.length} filebee links:`, filebeeMatches);
      
      // Limit to first 2 filebee links to avoid timeout on Vercel
      const limitedFilebeeLinks = filebeeMatches.slice(0, 2);
      
      for (const filebeeLink of limitedFilebeeLinks) {
        try {
          // Add timeout for Vercel
          const filebeeController = new AbortController();
          const filebeeTimeout = setTimeout(() => filebeeController.abort(), 10000); // 10 second timeout
          
          // Try to fetch the filebee page
          const response = await fetch(filebeeLink, { 
            signal: filebeeController.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          
          clearTimeout(filebeeTimeout);
          
          if (response.ok) {
            const filebeeContent = await response.text();
            
            // Look for direct video links in filebee content
            const videoMatches = filebeeContent.match(/https?:\/\/[^\s"']*\.(?:mp4|m3u8|mkv|avi|mov|wmv|flv|webm)/gi);
            if (videoMatches) {
              videoMatches.forEach(match => {
                streams.push({
                  server: 'Filebee',
                  link: match,
                  type: match.split('.').pop() || 'mp4'
                });
              });
            }
            
            // Look for download buttons or links
            const downloadMatches = filebeeContent.match(/<a[^>]*href=["']([^"']*download[^"']*)["'][^>]*>/gi);
            if (downloadMatches) {
              downloadMatches.forEach(match => {
                const hrefMatch = match.match(/href=["']([^"']+)["']/);
                if (hrefMatch && hrefMatch[1]) {
                  const link = hrefMatch[1].startsWith('http') ? hrefMatch[1] : new URL(hrefMatch[1], filebeeLink).href;
                  streams.push({
                    server: 'Filebee Download',
                    link,
                    type: 'mp4'
                  });
                }
              });
            }
          }
        } catch (error: any) {
          console.warn(`[STREAM-API] Failed to process filebee link ${filebeeLink}:`, error.message);
        }
      }
    }
    
  } catch (error: any) {
    console.warn(`[STREAM-API] Filebee extraction error:`, error.message);
  }
  
  return streams;
}

export async function GET(req: NextRequest) {
  try {
    const {searchParams} = new URL(req.url);
    const providerValue = searchParams.get('provider') || '';
    const link = searchParams.get('link') || '';
    const type = searchParams.get('type') || 'movie';
    
    console.log(`[STREAM-API] Request: provider=${providerValue}, type=${type}, link=${link}`);
    
    if (!providerValue || !link) {
      console.error('[STREAM-API] Missing required parameters');
      return NextResponse.json({error: 'provider and link required'}, {status: 400});
    }
    
    // Resolve relative URLs to full URLs using provider's base URL
    let resolvedLink = link;
    if (link.startsWith('/') && !link.startsWith('//')) {
      console.log(`[STREAM-API] Detected relative URL, resolving with provider base URL...`);
      try {
        const baseUrl = await getBaseUrl(providerValue);
        if (baseUrl) {
          resolvedLink = baseUrl.replace(/\/$/, '') + link;
          console.log(`[STREAM-API] Resolved URL: ${resolvedLink}`);
        } else {
          console.warn(`[STREAM-API] No base URL found for provider: ${providerValue}`);
        }
      } catch (baseUrlError: any) {
        console.warn(`[STREAM-API] Failed to get base URL:`, baseUrlError.message);
      }
    }
    
    // Fetch provider modules
    console.log(`[STREAM-API] Fetching modules for provider: ${providerValue}`);
    
    // Force refresh modules for testing (bypass cache)
    const forceRefresh = searchParams.get('refresh') === 'true';
    if (forceRefresh) {
      console.log(`[STREAM-API] Force refreshing modules (bypassing cache)`);
      clearProviderCache(providerValue);
    }
    
    // Also check if we should force refresh based on timestamp
    const cacheAge = searchParams.get('cache_age');
    if (cacheAge && parseInt(cacheAge) > 300000) { // 5 minutes
      console.log(`[STREAM-API] Cache age threshold exceeded, forcing refresh`);
      clearProviderCache(providerValue);
    }
    
    const modules = await fetchProviderModules(providerValue);
    console.log(`[STREAM-API] Modules fetched:`, Object.keys(modules));
    
    // Check if stream module exists
    if (!modules.stream) {
      console.error(`[STREAM-API] No stream module found for provider: ${providerValue}`);
      return NextResponse.json({error: `No stream module for provider: ${providerValue}`}, {status: 500});
    }
    
    console.log(`[STREAM-API] Stream module found, executing...`);
    
    // Execute the stream module
    const streamModule = executeModule(modules.stream);
    console.log(`[STREAM-API] Stream module executed:`, typeof streamModule);
    
    // Find the getStream function
    const getStream =
      (streamModule as any).getStream ||
      (streamModule as any).default?.getStream ||
      (streamModule as any).stream ||
      (streamModule as any).default?.stream;
    
    if (!getStream || typeof getStream !== 'function') {
      console.error(`[STREAM-API] getStream function not found in module:`, streamModule);
      return NextResponse.json({error: 'getStream function not available'}, {status: 500});
    }
    
    console.log(`[STREAM-API] getStream function found, calling with:`, { link: resolvedLink, type });
    
    // Log provider context for debugging
    console.log(`[STREAM-API] Provider context keys:`, Object.keys(providerContext));
    console.log(`[STREAM-API] Provider context axios:`, typeof providerContext.axios);
    console.log(`[STREAM-API] Provider context cheerio:`, typeof providerContext.cheerio);
    console.log(`[STREAM-API] Provider context extractors:`, Object.keys(providerContext.extractors));
    console.log(`[STREAM-API] Provider context headers:`, Object.keys(providerContext.commonHeaders));
    
    // Call getStream function with detailed logging
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout>;
    
    try {
      console.log(`[STREAM-API] About to call getStream function...`);
      console.log(`[STREAM-API] Arguments being passed:`, { link: resolvedLink, type, signal: controller.signal, providerContext: Object.keys(providerContext) });
      
      // Add timeout to prevent hanging
      timeoutId = setTimeout(() => {
        console.warn(`[STREAM-API] getStream function timeout after 30 seconds, aborting...`);
        controller.abort();
      }, 30000);
      
      const data = await getStream({
        link: resolvedLink,
        type,
        signal: controller.signal,
        providerContext,
      });
      
              clearTimeout(timeoutId);
        
        console.log(`[STREAM-API] getStream completed successfully`);
        console.log(`[STREAM-API] getStream result type:`, typeof data);
        console.log(`[STREAM-API] getStream result:`, data);
        console.log(`[STREAM-API] getStream result length:`, Array.isArray(data) ? data.length : 'not array');
        
        if (Array.isArray(data) && data.length === 0) {
          console.warn(`[STREAM-API] getStream returned empty array - this might indicate extraction failure`);
          console.warn(`[STREAM-API] This could be due to: URL parsing failure, HTTP request failure, content parsing failure, or extraction logic failure`);
          
          // Try to get more debugging info from the provider module
          try {
            console.log(`[STREAM-API] Attempting to debug empty result...`);
            
            // Check if there are any debug functions available
            const debugFn = (streamModule as any).debug || (streamModule as any).test || (streamModule as any).getInfo;
            if (debugFn && typeof debugFn === 'function') {
              console.log(`[STREAM-API] Found debug function, calling it...`);
              const debugResult = await debugFn({ link, type, providerContext });
              console.log(`[STREAM-API] Debug function result:`, debugResult);
            }
            
            // Check if the module has any internal state or logs
            if ((streamModule as any).logs) {
              console.log(`[STREAM-API] Module logs:`, (streamModule as any).logs);
            }
            
          } catch (debugError) {
            console.warn(`[STREAM-API] Debug attempt failed:`, debugError);
          }
          
          // Try alternative URL formats if the original failed
          console.log(`[STREAM-API] Attempting alternative URL formats...`);
          const alternativeUrls = await generateAlternativeUrls(resolvedLink);
          
          for (const altUrl of alternativeUrls) {
            try {
              console.log(`[STREAM-API] Trying alternative URL: ${altUrl}`);
              const altData = await getStream({
                link: altUrl,
                type,
                signal: controller.signal,
                providerContext,
              });
              
              if (Array.isArray(altData) && altData.length > 0) {
                console.log(`[STREAM-API] Alternative URL succeeded: ${altUrl}`);
                console.log(`[STREAM-API] Alternative data:`, altData);
                return NextResponse.json({data: altData, source: 'alternative-url'});
              }
            } catch (altError: any) {
              console.warn(`[STREAM-API] Alternative URL failed: ${altUrl}`, altError.message);
            }
          }
          
          // If all alternatives fail, try comprehensive extraction with all extractors
          console.log(`[STREAM-API] All alternative URLs failed, trying comprehensive extraction...`);
          const comprehensiveData = await tryComprehensiveExtraction(resolvedLink, type, controller.signal);
          
          if (comprehensiveData.length > 0) {
            console.log(`[STREAM-API] Comprehensive extraction succeeded with ${comprehensiveData.length} streams`);
            return NextResponse.json({data: comprehensiveData, source: 'comprehensive-extraction'});
          }
          
          // NEW: Try stream-fallback API as last resort
          try {
            console.log(`[STREAM-API] Comprehensive extraction failed, trying stream-fallback API...`);
            const fallbackUrl = new URL('/api/stream-fallback', req.url);
            fallbackUrl.searchParams.set('link', resolvedLink);
            fallbackUrl.searchParams.set('type', type);
            
            const fallbackResponse = await fetch(fallbackUrl.toString(), { signal: controller.signal });
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              if (fallbackData.data && Array.isArray(fallbackData.data) && fallbackData.data.length > 0) {
                console.log(`[STREAM-API] Stream-fallback API succeeded with ${fallbackData.data.length} streams`);
                return NextResponse.json({data: fallbackData.data, source: 'stream-fallback-api'});
              }
            }
          } catch (fallbackError: any) {
            console.warn(`[STREAM-API] Stream-fallback API failed:`, fallbackError.message);
          }
          
          // If all alternatives fail, return a helpful error message
          return NextResponse.json({
            error: 'Content extraction failed',
            details: 'The provider was unable to extract content from the URL. This could be due to:',
            reasons: [
              'The website is blocking automated requests (Cloudflare protection)',
              'The content has been removed or is no longer available',
              'The URL format is not supported by this provider',
              'The provider module needs to be updated'
            ],
            suggestions: [
              'Try refreshing the page',
              'Check if the content is still available',
              'Try a different provider if available',
              'Contact support if the issue persists'
            ],
            originalUrl: link,
            resolvedUrl: resolvedLink,
            provider: providerValue
          }, {status: 422});
        }
        
        console.log(`[STREAM-API] Returning data:`, { data: data || [] });
        
        return NextResponse.json({data: data || []});
        
      } catch (getStreamError: any) {
        clearTimeout(timeoutId);
        console.error(`[STREAM-API] getStream function threw an error:`, getStreamError);
        console.error(`[STREAM-API] getStream error message:`, getStreamError?.message);
        console.error(`[STREAM-API] getStream error stack:`, getStreamError?.stack);
        
        // Check if it's an abort error
        if (getStreamError.name === 'AbortError') {
          return NextResponse.json({
            error: 'Request timeout - the provider took too long to respond',
            details: 'Try again or check if the provider is working'
          }, {status: 408});
        }
        
        return NextResponse.json({
          error: `getStream function failed: ${getStreamError?.message || 'Unknown error'}`,
          details: process.env.NODE_ENV === 'development' ? getStreamError?.stack : undefined
        }, {status: 500});
      }
      
    } catch (e: any) {
      console.error(`[STREAM-API] Error:`, e);
      console.error(`[STREAM-API] Error stack:`, e?.stack);
      console.error(`[STREAM-API] Error message:`, e?.message);
      
      return NextResponse.json({
        error: e?.message || 'Unknown error occurred',
        details: process.env.NODE_ENV === 'development' ? e?.stack : undefined
      }, {status: 500});
    }
  }