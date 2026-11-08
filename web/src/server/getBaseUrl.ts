const memoryCache = new Map<string, { url: string; ts: number }>();
const EXPIRE_MS = 30 * 60 * 1000; // 30 minutes cache

const MODFLIX_JSON_URLS = [
  'https://raw.githubusercontent.com/himanshu8443/providers/himanshu8443-patch-2/modflix.json',
  'https://raw.githubusercontent.com/himanshu8443/providers/main/modflix.json',
  'https://himanshu8443.github.io/providers/modflix.json',
];

let cachedConfig: { data: Record<string, any>; ts: number } | null = null;

async function fetchModflixConfig(): Promise<Record<string, any>> {
  if (cachedConfig && Date.now() - cachedConfig.ts < EXPIRE_MS) {
    return cachedConfig.data;
  }

  for (const url of MODFLIX_JSON_URLS) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'HubD4U/1.0' },
        next: { revalidate: 1800 },
      });
      if (res.ok) {
        const json = await res.json();
        if (json && typeof json === 'object') {
          cachedConfig = { data: json, ts: Date.now() };
          return json;
        }
      }
    } catch {}
  }

  return cachedConfig?.data || {};
}

function resolveProviderUrl(json: Record<string, any>, providerValue: string): string {
  const p = (providerValue || '').toLowerCase().trim();

  // 1. Direct key match or object name match (case-insensitive)
  for (const [k, v] of Object.entries(json)) {
    if (k.toLowerCase() === p || (v?.name && v.name.toLowerCase() === p)) {
      return v.url || '';
    }
  }

  // 2. Known aliases mapping
  const aliases: Record<string, string[]> = {
    vegamovies: ['vega'],
    vega: ['vegamovies'],
    modflix: ['moviesmod', 'mod'],
    mod: ['moviesmod', 'mod'],
    moviesmod: ['mod', 'moviesmod'],
    hdhub4u: ['hdhub'],
    hdhub: ['hdhub4u'],
    multimovies: ['multi'],
    multi: ['multimovies'],
    world4ufree: ['w4u', 'world4u'],
    world4u: ['w4u', 'world4ufree'],
    w4u: ['world4ufree', 'world4u'],
    katmovieshd: ['kat'],
    kat: ['katmovieshd'],
    moviesdrive: ['drive'],
    drive: ['moviesdrive'],
    dramacool: ['dc'],
    dc: ['dramacool'],
    netflixmirror: ['nfmirror'],
    nfmirror: ['netflixmirror'],
    primewire: ['primewire'],
    topmovies: ['topmovies'],
    uhdmovies: ['uhdmovies'],
  };

  const targets = aliases[p] || [];
  for (const target of targets) {
    for (const [k, v] of Object.entries(json)) {
      if (k.toLowerCase() === target.toLowerCase() || (v?.name && v.name.toLowerCase() === target.toLowerCase())) {
        return v.url || '';
      }
    }
  }

  return '';
}

export async function getBaseUrl(providerValue: string): Promise<string> {
  const norm = (providerValue || '').toLowerCase().trim();
  const cached = memoryCache.get(norm);
  if (cached && Date.now() - cached.ts < EXPIRE_MS) {
    return cached.url;
  }

  const config = await fetchModflixConfig();
  const baseUrl = resolveProviderUrl(config, norm);
  
  if (baseUrl) {
    memoryCache.set(norm, { url: baseUrl, ts: Date.now() });
    console.log(`[GET-BASE-URL] Resolved ${providerValue} -> ${baseUrl}`);
  } else {
    console.warn(`[GET-BASE-URL] Could not find base URL for: ${providerValue}`);
  }

  return baseUrl;
}
