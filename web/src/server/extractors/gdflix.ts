import axios from 'axios';
import * as cheerio from 'cheerio';

const headers = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

export async function gdFlixExtracter(link: string, signal: AbortSignal) {
  const streamLinks: {server: string; link: string; type: string}[] = [];
  
  // Guard against undefined/null/empty links
  if (!link || typeof link !== 'string') {
    console.warn(`[GDFLIX] Invalid link provided: ${link}`);
    return streamLinks;
  }
  
  try {
    console.log(`[GDFLIX] Processing link: ${link}`);
    const baseUrl = link.split('/').slice(0, 3).join('/');
    
    const res = await axios.get(link, { headers, signal, timeout: 15000 });
    let $drive = cheerio.load(res.data);

    // Handle redirect via location.replace
    const onloadAttr = $drive('body').attr('onload');
    if (onloadAttr?.includes('location.replace')) {
      const newLink = onloadAttr.split("location.replace('")?.[1]?.split("'")?.[0];
      if (newLink) {
        console.log(`[GDFLIX] Following redirect to: ${newLink}`);
        const newRes = await axios.get(newLink, { headers, signal, timeout: 15000 });
        $drive = cheerio.load(newRes.data);
      }
    }

    // Look for R2/Cloud download links
    try {
      const r2Link =
        $drive('.btn.btn-outline-success').attr('href') ||
        $drive('a:contains("CLOUD DOWNLOAD")').attr('href') ||
        $drive('a:contains("R2 DOWNLOAD")').attr('href') ||
        $drive('a[href*="r2.dev"]').attr('href') ||
        '';
      if (r2Link) {
        console.log(`[GDFLIX] Found R2 link: ${r2Link}`);
        streamLinks.push({server: 'R2', link: r2Link, type: 'mkv'});
      }
    } catch (err) {
      console.log('[GDFLIX] R2 link not found', err);
    }

    // Look for PixelDrain links
    try {
      const pixelDrainLink = 
        $drive('.btn.btn-success').attr('href') || 
        $drive('a[href*="pixeldrain"]').attr('href') ||
        '';
      if (pixelDrainLink) {
        let finalLink = pixelDrainLink;
        // Convert to API download link if needed
        if (!pixelDrainLink.includes('/api/')) {
          const token = pixelDrainLink.split('/').pop();
          finalLink = `https://pixeldrain.com/api/file/${token}?download`;
        }
        console.log(`[GDFLIX] Found PixelDrain link: ${finalLink}`);
        streamLinks.push({server: 'PixelDrain', link: finalLink, type: 'mkv'});
      }
    } catch (err) {
      console.log('[GDFLIX] PixelDrain link not found', err);
    }

    // ResumeBot/IndexBot extraction (from Vega)
    try {
      const resumeDrive = $drive('.btn-secondary').attr('href') || '';
      console.log(`[GDFLIX] resumeDrive: ${resumeDrive}`);
      const hostname = resumeDrive.split('/')[2] || '';
      
      if (resumeDrive.includes('indexbot') || hostname.includes('bot')) {
        // IndexBot/ResumeBot pattern
        const resumeBotRes = await axios.get(resumeDrive, { headers, signal, timeout: 15000 });
        console.log(`[GDFLIX] resumeBotRes fetched`);
        
        const resumeBotToken = resumeBotRes.data.match(
          /formData\.append\('token', '([a-f0-9]+)'\)/
        )?.[1];
        
        if (resumeBotToken) {
          console.log(`[GDFLIX] resumeBotToken: ${resumeBotToken}`);
          const resumeBotPath = resumeBotRes.data.match(
            /fetch\('\/download\?id=([a-zA-Z0-9\/+]+)'/
          )?.[1];
          const resumeBotBaseUrl = resumeDrive.split('/download')[0];
          
          if (resumeBotPath) {
            const resumeBotBody = new URLSearchParams();
            resumeBotBody.append('token', resumeBotToken);
            
            const resumeBotDownload = await axios.post(
              resumeBotBaseUrl + '/download?id=' + resumeBotPath,
              resumeBotBody.toString(),
              {
                headers: {
                  ...headers,
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'Referer': resumeDrive,
                },
                signal,
                timeout: 15000,
              }
            );
            
            if (resumeBotDownload.data?.url) {
              console.log(`[GDFLIX] ResumeBot URL: ${resumeBotDownload.data.url}`);
              streamLinks.push({
                server: 'ResumeBot',
                link: resumeBotDownload.data.url,
                type: 'mkv',
              });
            }
          }
        }
      } else if (resumeDrive) {
        // ResumeCloud pattern
        const url = resumeDrive.startsWith('http') ? resumeDrive : baseUrl + resumeDrive;
        const resumeDriveRes = await axios.get(url, { headers, signal, timeout: 15000 });
        const $resumeDrive = cheerio.load(resumeDriveRes.data);
        const resumeLink = $resumeDrive('.btn-success').attr('href');
        
        if (resumeLink) {
          console.log(`[GDFLIX] ResumeCloud link: ${resumeLink}`);
          streamLinks.push({
            server: 'ResumeCloud',
            link: resumeLink,
            type: 'mkv',
          });
        }
      }
    } catch (err) {
      console.log('[GDFLIX] Resume link not found', err);
    }

    // G-Drive Instant link extraction (from Vega)
    try {
      const seed = $drive('.btn-danger').attr('href') || '';
      console.log(`[GDFLIX] seed: ${seed}`);
      
      if (seed) {
        if (!seed.includes('?url=')) {
          // Direct redirect - follow it
          const newLinkRes = await axios.head(seed, { 
            headers, 
            signal, 
            timeout: 15000,
            maxRedirects: 5,
          });
          const newLink = newLinkRes.request?.res?.responseUrl?.split('?url=')?.[1] || seed;
          streamLinks.push({ server: 'G-Drive', link: newLink, type: 'mkv' });
        } else {
          // Token-based instant link
          const instantToken = seed.split('=')[1];
          if (instantToken) {
            const videoSeedUrl = seed.split('/').slice(0, 3).join('/') + '/api';
            console.log(`[GDFLIX] videoSeedUrl: ${videoSeedUrl}`);
            
            const instantBody = new URLSearchParams();
            instantBody.append('keys', instantToken);
            
            const instantLinkRes = await axios.post(videoSeedUrl, instantBody.toString(), {
              headers: {
                ...headers,
                'Content-Type': 'application/x-www-form-urlencoded',
                'x-token': videoSeedUrl,
              },
              signal,
              timeout: 15000,
            });
            
            if (instantLinkRes.data?.error === false && instantLinkRes.data?.url) {
              console.log(`[GDFLIX] Gdrive-Instant link: ${instantLinkRes.data.url}`);
              streamLinks.push({
                server: 'Gdrive-Instant',
                link: instantLinkRes.data.url,
                type: 'mkv',
              });
            } else {
              console.log('[GDFLIX] Instant link not found', instantLinkRes.data);
            }
          }
        }
      }
    } catch (err) {
      console.log('[GDFLIX] Instant link not found', err);
    }

    // Look for any other download buttons
    $drive('a.btn, a[href*="download"], a[href*=".mkv"], a[href*=".mp4"]').each((_, el) => {
      const href = $drive(el).attr('href') || '';
      if (href && href.startsWith('http') && !streamLinks.find(s => s.link === href)) {
        const server = href.includes('pixeldrain') ? 'PixelDrain' :
                       href.includes('r2.dev') ? 'R2' :
                       href.includes('cloudflarestorage') ? 'CfStorage' :
                       'Direct';
        streamLinks.push({server, link: href, type: 'mkv'});
      }
    });

    // Look for direct video links in the page
    const videoMatches = res.data.match(/https?:\/\/[^\s"'<>]+\.(mp4|mkv|avi|webm|m3u8)/gi) || [];
    for (const videoLink of videoMatches) {
      if (!streamLinks.find(s => s.link === videoLink)) {
        const ext = videoLink.split('.').pop()?.toLowerCase() || 'mkv';
        streamLinks.push({server: 'Direct Video', link: videoLink, type: ext});
      }
    }

    console.log(`[GDFLIX] Extraction complete, found ${streamLinks.length} links`);
    return streamLinks;
    
  } catch (error: any) {
    console.error(`[GDFLIX] Extraction error:`, error.message);
    return streamLinks;
  }
}


