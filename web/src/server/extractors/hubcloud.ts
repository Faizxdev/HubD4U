import axios from 'axios';
import * as cheerio from 'cheerio';

// Multiple user agents to rotate through
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
];

const getHeaders = (referer?: string) => ({
  'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  ...(referer ? { 'Referer': referer } : {}),
});

function decode(value: string) {
  if (!value) return '';
  try {
    return Buffer.from(value, 'base64').toString('utf-8');
  } catch {
    return '';
  }
}

// Extract file ID from various URL formats
function extractFileId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    
    if (pathParts[0] === 'file' && pathParts[1]) return pathParts[1];
    if (pathParts[0] === 'drive' && pathParts[1]) return pathParts[1];
    if (pathParts.length === 1 && /^[a-zA-Z0-9]+$/.test(pathParts[0])) return pathParts[0];
    
    return pathParts[pathParts.length - 1] || null;
  } catch {
    return null;
  }
}

// Fast fetching with optimized retries and parallel fallback
async function fetchWithRetry(url: string, signal: AbortSignal, referer?: string, maxRetries = 2): Promise<string | null> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const headers = getHeaders(referer);
      const response = await axios.get(url, {
        headers,
        signal,
        timeout: 8000,
        maxRedirects: 5,
        validateStatus: (status) => status < 500,
      });
      
      if (response.status === 403) {
        if (i < maxRetries - 1) {
          await new Promise(r => setTimeout(r, 150));
        }
        continue;
      }
      
      if (response.status >= 200 && response.status < 300) {
        return response.data;
      }
    } catch (error: any) {
      if (i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 150));
      }
    }
  }
  return null;
}

// Try to get download link via AJAX endpoint
async function tryAjaxDownload(baseUrl: string, fileId: string, signal: AbortSignal): Promise<string | null> {
  const endpoints = [
    { url: `${baseUrl}/ajax.php?ajax=direct-download`, refPath: `/file/${fileId}`, method: 'POST' },
    { url: `${baseUrl}/ajax.php?ajax=download`, refPath: `/file/${fileId}`, method: 'POST' },
    { url: `${baseUrl}/api/download`, refPath: `/drive/${fileId}`, method: 'POST' },
    { url: `${baseUrl}/download/${fileId}`, refPath: `/file/${fileId}`, method: 'GET' },
    { url: `${baseUrl}/api/file/${fileId}`, refPath: `/file/${fileId}`, method: 'GET' },
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`[HUBCLOUD] Trying AJAX: ${endpoint.url} (${endpoint.method})`);
      
      const config = {
        headers: {
          ...getHeaders(`${baseUrl}${endpoint.refPath}`),
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest',
        },
        signal,
        timeout: 15000,
      };
      
      const response = endpoint.method === 'POST' 
        ? await axios.post(endpoint.url, `id=${fileId}`, config)
        : await axios.get(endpoint.url, config);
      
      // Check various response formats
      if (response.data?.code === '200' && response.data?.file) {
        console.log(`[HUBCLOUD] AJAX succeeded: ${endpoint.url}`);
        return response.data.file;
      }
      if (response.data?.url) return response.data.url;
      if (response.data?.link) return response.data.link;
      if (response.data?.download) return response.data.download;
      if (response.data?.data?.url) return response.data.data.url;
      if (response.data?.data?.link) return response.data.data.link;
      
      // Check if response is a direct URL string
      if (typeof response.data === 'string' && response.data.startsWith('http')) {
        return response.data;
      }
    } catch (error: any) {
      console.warn(`[HUBCLOUD] AJAX failed for ${endpoint.url}:`, error.message);
    }
  }
  return null;
}

// Check if a URL is likely a valid video/download link
function isValidVideoLink(url: string): boolean {
  const lower = url.toLowerCase();
  
  // Blacklist - definitely not video links
  const blacklist = [
    '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf',
    'font-awesome', 'bootstrap', 'jquery', 'popper.js', 'unpkg.com/site',
    'cdnjs.cloudflare.com', 'cdn.jsdelivr.net/npm',
    '/assets/', '/static/', '/images/', '/fonts/', '/css/', '/js/',
    't.me/', 'telegram', 'twitter.com', 'facebook.com', 'instagram.com',
    '/admin', '/login', '/register', '/contact', '/about', '/privacy', '/terms',
    'header.gif', 'footer.gif', 'logo.', 'banner.',
  ];
  
  for (const blocked of blacklist) {
    if (lower.includes(blocked)) return false;
  }
  
  // Must not be just a homepage (no path or just /)
  try {
    const urlObj = new URL(url);
    if (urlObj.pathname === '/' || urlObj.pathname === '') {
      // Allow if it has query params that look like file IDs
      if (!urlObj.search || urlObj.search.length < 10) {
        return false;
      }
    }
    // Block paths that are just /drive/admin or similar short admin paths
    if (urlObj.pathname.match(/^\/(drive|file)\/(admin|login|register|assets)$/i)) {
      return false;
    }
  } catch {
    return false;
  }
  
  // Whitelist - definitely video links
  const whitelist = [
    '.mp4', '.mkv', '.avi', '.mov', '.webm', '.m3u8', '.ts',
    'cloudflarestorage', 'r2.dev', 'workers.dev',
    'hubcdn', 'firecdn', 'pixeldrain', 'gofile',
    '?id=', '?token=', 'X-Amz-', 
  ];
  
  for (const allowed of whitelist) {
    if (lower.includes(allowed)) return true;
  }
  
  // Check for file/drive paths with actual IDs (not admin/assets)
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    // Valid patterns: /file/abc123, /drive/xyz789
    if ((pathParts[0] === 'file' || pathParts[0] === 'drive') && pathParts[1]) {
      const id = pathParts[1];
      // ID should be alphanumeric and at least 5 chars, not a reserved word
      if (id.length >= 5 && /^[a-zA-Z0-9]+$/.test(id) && 
          !['admin', 'login', 'assets', 'static', 'images'].includes(id.toLowerCase())) {
        return true;
      }
    }
  } catch {}
  
  // If it's from a known video hosting domain with query params, allow it
  const videoDomains = ['gamerxyt.com'];
  for (const domain of videoDomains) {
    if (lower.includes(domain) && url.includes('?')) return true;
  }
  
  return false;
}

// Filter and clean stream links
function filterValidLinks(links: {server: string; link: string; type: string}[]): {server: string; link: string; type: string}[] {
  return links.filter(l => isValidVideoLink(l.link));
}

function detectServer(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes('pixeldrain') || lower.includes('pixeld')) return 'Pixeldrain';
  if (lower.includes('hubcloud')) return 'HubCloud';
  if (lower.includes('cloudflarestorage')) return 'CfStorage';
  if (lower.includes('fastdl')) return 'FastDl';
  if (lower.includes('hubcdn')) return 'HubCdn';
  if (lower.includes('.dev')) return 'Cf Worker';
  if (lower.includes('gofile')) return 'GoFile';
  if (lower.includes('streamtape')) return 'Streamtape';
  if (lower.includes('doodstream') || lower.includes('dood')) return 'DoodStream';
  if (lower.includes('mixdrop')) return 'Mixdrop';
  return 'Direct';
}

// Fix common link formats
function normalizeLink(href: string): string {
  if (href.includes('pixeldrain') && !href.includes('/api/')) {
    const token = href.split('/').pop();
    return `https://pixeldrain.com/api/file/${token}?download`;
  }
  return href;
}

function detectFileType(url: string): string {
  const lower = url.toLowerCase();
  const clean = lower.split('?')[0];
  if (clean.endsWith('.m3u8') || lower.includes('.m3u8')) return 'm3u8';
  if (clean.endsWith('.mp4') || clean.endsWith('.m4v') || lower.includes('.mp4')) return 'mp4';
  if (clean.endsWith('.webm') || lower.includes('.webm')) return 'webm';
  if (clean.endsWith('.mkv') || lower.includes('.mkv')) return 'mkv';
  if (lower.includes('pixeldrain.com') || lower.includes('cloudflarestorage') || lower.includes('fastdl')) return 'mp4';
  return 'mkv';
}

// Follow redirect with manual handling to extract final URL (from Vega)
async function followRedirectManual(url: string, signal: AbortSignal, referer?: string): Promise<string> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: getHeaders(referer),
      signal,
      redirect: 'manual',
    });
    
    // Check if response is a redirect (301, 302, etc.)
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location) {
        // Handle googleusercontent links (from Vega)
        if (location.includes('googleusercontent')) {
          return location.split('?link=')[1] || location;
        }
        // Follow one more redirect if needed
        const response2 = await fetch(location, {
          method: 'HEAD',
          headers: getHeaders(url),
          signal,
          redirect: 'manual',
        });
        if (response2.status >= 300 && response2.status < 400) {
          const location2 = response2.headers.get('location');
          if (location2?.includes('?link=')) {
            return location2.split('?link=')[1] || location2;
          }
          return location2 || location;
        }
        return location;
      }
    }
    return url;
  } catch (error: any) {
    console.warn(`[HUBCLOUD] followRedirectManual error:`, error.message);
    return url;
  }
}

// Extract links from HTML content
function extractLinksFromHtml(html: string, baseUrl: string): {server: string; link: string; type: string}[] {
  const links: {server: string; link: string; type: string}[] = [];
  const $ = cheerio.load(html);
  
  // Button links
  $('a.btn, .btn-success, .btn-danger, .btn-primary, .btn-secondary, a[href*="pixel"], a[href*="hubcloud"], a[href*=".dev"], a[href*="fastdl"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (href && href.startsWith('http') && !href.includes('javascript') && !href.includes('gofile.io/d/')) {
      const finalLink = normalizeLink(href);
      if (!links.find(s => s.link === finalLink)) {
        links.push({ server: detectServer(href), link: finalLink, type: detectFileType(finalLink) });
      }
    }
  });
  
  // Download links with specific text
  $('a:contains("Download"), a:contains("DOWNLOAD"), a:contains("Direct"), a:contains("DIRECT"), a:contains("Stream"), a:contains("STREAM")').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (href && href.startsWith('http') && !href.includes('javascript')) {
      const finalLink = normalizeLink(href);
      if (!links.find(s => s.link === finalLink)) {
        links.push({ server: detectServer(href), link: finalLink, type: detectFileType(finalLink) });
      }
    }
  });
  
  // Video source elements
  $('video source, video').each((_, el) => {
    const src = $(el).attr('src') || '';
    if (src && src.startsWith('http')) {
      if (!links.find(s => s.link === src)) {
        const ext = src.split('.').pop()?.toLowerCase() || 'mp4';
        links.push({ server: 'HTML5 Video', link: src, type: ext });
      }
    }
  });
  
  // Iframe embeds (potential video players)
  $('iframe').each((_, el) => {
    const src = $(el).attr('src') || '';
    if (src && src.startsWith('http') && !src.includes('google') && !src.includes('facebook') && !src.includes('twitter')) {
      if (!links.find(s => s.link === src)) {
        links.push({ server: 'Embedded Player', link: src, type: 'iframe' });
      }
    }
  });
  
  // Direct video links in text
  const videoMatches = html.match(/https?:\/\/[^\s"'<>]+\.(mp4|mkv|avi|mov|webm|m3u8)/gi) || [];
  for (const videoLink of videoMatches) {
    if (!links.find(s => s.link === videoLink)) {
      const ext = videoLink.split('.').pop()?.toLowerCase() || 'mkv';
      links.push({ server: 'Direct Video', link: videoLink, type: ext });
    }
  }
  
  // CDN/storage links
  const cdnMatches = html.match(/https?:\/\/[^\s"'<>]*(cloudflarestorage|r2\.dev|workers\.dev|cdn|storage)[^\s"'<>]*/gi) || [];
  for (const cdnLink of cdnMatches) {
    // Clean up the link (remove trailing quotes, brackets, etc.)
    const cleanLink = cdnLink.replace(/['"<>\]\)]+$/, '');
    if (!links.find(s => s.link === cleanLink) && cleanLink.length > 20) {
      links.push({ server: 'CDN', link: cleanLink, type: 'mkv' });
    }
  }
  
  // Look for JSON data with video URLs
  const jsonMatches = html.match(/["'](?:url|link|file|source|src)["']\s*:\s*["'](https?:\/\/[^"']+)["']/gi) || [];
  for (const jsonMatch of jsonMatches) {
    const urlMatch = jsonMatch.match(/https?:\/\/[^"']+/);
    if (urlMatch && !links.find(s => s.link === urlMatch[0])) {
      links.push({ server: 'JSON Data', link: urlMatch[0], type: 'mkv' });
    }
  }
  
  // Look for base64 encoded URLs
  const base64Matches = html.match(/atob\s*\(\s*["']([A-Za-z0-9+/=]+)["']\s*\)/gi) || [];
  for (const b64Match of base64Matches) {
    const encoded = b64Match.match(/["']([A-Za-z0-9+/=]+)["']/)?.[1];
    if (encoded) {
      const decoded = decode(encoded);
      if (decoded.startsWith('http') && !links.find(s => s.link === decoded)) {
        links.push({ server: 'Decoded', link: decoded, type: 'mkv' });
      }
    }
  }
  
  return links;
}

export async function hubcloudExtracter(link: string, signal: AbortSignal) {
  const streamLinks: {server: string; link: string; type: string}[] = [];
  
  // Guard against undefined/null/empty links
  if (!link || typeof link !== 'string') {
    console.warn(`[HUBCLOUD] Invalid link provided: ${link}`);
    return streamLinks;
  }
  
  try {
    console.log(`[HUBCLOUD] Processing link: ${link}`);
    const baseUrl = link.split('/').slice(0, 3).join('/');
    const fileId = extractFileId(link);
    
    // Step 1: Fetch the initial page with retry
    const vLinkText = await fetchWithRetry(link, signal);
    if (!vLinkText) {
      console.warn(`[HUBCLOUD] Failed to fetch initial page after retries`);
      return streamLinks;
    }
    
    console.log(`[HUBCLOUD] Initial page fetched, length: ${vLinkText.length}`);
    const $ = cheerio.load(vLinkText);
    
    // Step 2: Check for redirect URL pattern (base64 encoded) - Vega style
    const vLinkRedirect = vLinkText.match(/var\s+url\s*=\s*['"]([^'"]+)['"]/) || [];
    let vcloudLink =
      decode(vLinkRedirect[1]?.split('r=')?.[1]) ||
      vLinkRedirect[1] ||
      $('.fa-file-download.fa-lg').parent().attr('href') ||
      link;
    
    console.log(`[HUBCLOUD] vcloudLink: ${vcloudLink}`);
    
    if (vcloudLink?.startsWith('/')) {
      vcloudLink = `${baseUrl}${vcloudLink}`;
      console.log(`[HUBCLOUD] New vcloudLink: ${vcloudLink}`);
    }
    
    // Step 3: Fetch the vcloud page
    let vcloudHtml = vLinkText;
    if (vcloudLink && vcloudLink !== link) {
      const vcloudRes = await fetchWithRetry(vcloudLink, signal, link);
      if (vcloudRes) {
        vcloudHtml = vcloudRes;
      }
    }
    
    const $vcloud = cheerio.load(vcloudHtml);
    
    // Step 4: Extract links from buttons in parallel
    const linkClass = $vcloud('.btn-success.btn-lg.h6, .btn-danger, .btn-secondary, .btn-success, .btn-primary');
    const buttonElements = linkClass.toArray();
    await Promise.allSettled(
      buttonElements.map(async (element) => {
        const itm = $vcloud(element);
        let btnLink = itm.attr('href') || '';
        
        if (!btnLink || btnLink.includes('javascript')) return;
        
        if (btnLink.includes('.dev') && !btnLink.includes('/?id=')) {
          streamLinks.push({ server: 'Cf Worker', link: btnLink, type: detectFileType(btnLink) });
        } else if (btnLink.includes('pixeld')) {
          if (!btnLink.includes('api')) {
            const token = btnLink.split('/').pop();
            const pixelBaseUrl = btnLink.split('/').slice(0, -2).join('/');
            btnLink = `${pixelBaseUrl}/api/file/${token}?download`;
          }
          streamLinks.push({ server: 'Pixeldrain', link: btnLink, type: detectFileType(btnLink) });
        } else if (btnLink.includes('hubcloud') || btnLink.includes('/?id=')) {
          try {
            let newLink = await followRedirectManual(btnLink, signal, link);
            if (newLink.includes('googleusercontent')) {
              newLink = newLink.split('?link=')[1] || newLink;
            }
            if (newLink && !streamLinks.find(s => s.link === newLink)) {
              streamLinks.push({ server: 'HubCloud', link: newLink, type: detectFileType(newLink) });
            }
          } catch {}
        } else if (btnLink.includes('cloudflarestorage')) {
          streamLinks.push({ server: 'CfStorage', link: btnLink, type: detectFileType(btnLink) });
        } else if (btnLink.includes('fastdl') || btnLink.includes('fsl.')) {
          streamLinks.push({ server: 'FastDl', link: btnLink, type: detectFileType(btnLink) });
        } else if (btnLink.includes('hubcdn') && !btnLink.includes('/?id=')) {
          streamLinks.push({ server: 'HubCdn', link: btnLink, type: detectFileType(btnLink) });
        } else if (btnLink.includes('gofile')) {
          const id = btnLink.split('/d/')[1]?.split('?')[0]?.split('/')[0] || btnLink.split('/').filter(Boolean).pop();
          if (id) {
            try {
              const { gofileExtracter } = await import('@/server/extractors/gofile');
              const gf = await gofileExtracter(id);
              if (gf?.link && !streamLinks.find(s => s.link === gf.link)) {
                streamLinks.push({ server: 'GoFile Direct', link: gf.link, type: detectFileType(gf.link) });
              }
            } catch {}
          }
        } else if (btnLink.includes('.mkv') || btnLink.includes('.mp4')) {
          const serverName =
            btnLink.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i)?.[1]?.replace(/\./g, ' ') || 'Direct';
          streamLinks.push({ server: serverName, link: btnLink, type: detectFileType(btnLink) });
        }
      })
    );
    
    // Step 5: Try AJAX download if we have a file ID
    if (fileId && (link.includes('hubdrive') || link.includes('/file/') || link.includes('/drive/'))) {
      const ajaxLink = await tryAjaxDownload(baseUrl, fileId, signal);
      if (ajaxLink && !streamLinks.find(s => s.link === ajaxLink)) {
        streamLinks.push({ server: 'Direct Download', link: ajaxLink, type: detectFileType(ajaxLink) });
      }
    }
    
    // Step 6: Extract additional links from HTML
    const initialLinks = extractLinksFromHtml(vcloudHtml, baseUrl);
    for (const l of initialLinks) {
      if (!streamLinks.find(s => s.link === l.link)) {
        streamLinks.push(l);
      }
    }
    
    // Step 7: Follow HubCloud and vcloud links in parallel
    const hubcloudMatches = ((vcloudHtml.match(/https?:\/\/hubcloud\.[a-z]+\/[^\s"'<>]+/gi) || []) as string[]).slice(0, 3);
    const vcloudMatches = ((vcloudHtml.match(/https?:\/\/vcloud\.lol\/[a-zA-Z0-9]+/gi) || []) as string[])
      .filter((m: string) => !m.includes('/assets/') && !m.includes('.css') && !m.includes('.png') && !m.includes('.js'))
      .slice(0, 2);

    await Promise.allSettled([
      ...hubcloudMatches.map(async (hubcloudLink) => {
        const hubHtml = await fetchWithRetry(hubcloudLink, signal, link);
        if (hubHtml) {
          const hubLinks = extractLinksFromHtml(hubHtml, hubcloudLink.split('/').slice(0, 3).join('/'));
          for (const l of hubLinks) {
            if (!streamLinks.find(s => s.link === l.link)) {
              streamLinks.push(l);
            }
          }
        }
      }),
      ...vcloudMatches.map(async (vcloudLinkMatch) => {
        const vcloudHtmlInner = await fetchWithRetry(vcloudLinkMatch, signal, link);
        if (vcloudHtmlInner) {
          const vcloudLinks = extractLinksFromHtml(vcloudHtmlInner, 'https://vcloud.lol');
          for (const l of vcloudLinks) {
            if (!streamLinks.find(s => s.link === l.link)) {
              streamLinks.push(l);
            }
          }
        }
      }),
    ]);
    
    // Step 9: Try download button AJAX
    if (vcloudHtml.includes('myDirectDownload') && fileId) {
      const ajaxLink = await tryAjaxDownload(baseUrl, fileId, signal);
      if (ajaxLink && !streamLinks.find(s => s.link === ajaxLink)) {
        streamLinks.push({ server: 'Direct Download', link: ajaxLink, type: 'mkv' });
      }
    }
    
    console.log(`[HUBCLOUD] Extraction complete, found ${streamLinks.length} links`);
    
    // Filter out invalid/junk links
    const validLinks = filterValidLinks(streamLinks);
    console.log(`[HUBCLOUD] After filtering: ${validLinks.length} valid links`);
    
    return validLinks;
    
  } catch (error: any) {
    console.error(`[HUBCLOUD] Extraction error:`, error.message);
    return streamLinks;
  }
}
