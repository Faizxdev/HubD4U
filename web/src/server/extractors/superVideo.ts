export async function superVideoExtractor(data: any): Promise<string> {
  // Guard against undefined/null/empty data
  if (!data || typeof data !== 'string') {
    console.warn(`[SUPERVIDEO] Invalid data provided`);
    return '';
  }
  
  try {
    const functionRegex = /eval\(function\((.*?)\)\{.*?return p\}.*?\('(.*?)'\.split/;
    const match = functionRegex.exec(data);
    let p = '';
    if (match) {
      const encodedString = match[2];
      p = encodedString.split("',36,")?.[0].trim();
      let a = 36;
      let c = encodedString.split("',36,")[1].slice(2).split('|').length;
      let k = encodedString.split("',36,")[1].slice(2).split('|');
      while (c--) {
        if (k[c]) {
          const regex = new RegExp('\\b' + c.toString(a) + '\\b', 'g');
          p = p.replace(regex, k[c]);
        }
      }
    }
    const streamUrl = p?.match(/file:\s*"([^"]+\.m3u8[^"]*)"/i)?.[1];
    return streamUrl || '';
  } catch (err) {
    return '';
  }
}


