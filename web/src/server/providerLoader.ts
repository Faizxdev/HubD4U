import axios from 'axios';

type ProviderModuleName = 'posts' | 'meta' | 'stream' | 'catalog' | 'episodes';

type ProviderModules = {
  posts?: string;
  meta?: string;
  stream?: string;
  catalog?: string;
  episodes?: string;
};

// Multiple fallback URLs in case GitHub raw content is blocked
const BASE_URLS = [
  'https://raw.githubusercontent.com/Zenda-Cross/vega-providers/refs/heads/main/dist',
  'https://raw.githubusercontent.com/Zenda-Cross/vega-providers/main/dist',
  'https://github.com/Zenda-Cross/vega-providers/raw/main/dist'
];

// Persistent module cache (60 min cache)
const CACHE_MS = 60 * 60 * 1000;
const memoryCache: Map<string, {modules: ProviderModules; ts: number}> = 
  (globalThis as any).__providerCache || new Map<string, {modules: ProviderModules; ts: number}>();
(globalThis as any).__providerCache = memoryCache;

// Function to clear cache for testing
export function clearProviderCache(provider?: string) {
  if (provider) {
    const key = normalizeProviderValue(provider);
    memoryCache.delete(key);
    console.log(`[PROVIDER-LOADER] Cleared cache for provider: ${key}`);
  } else {
    memoryCache.clear();
    console.log(`[PROVIDER-LOADER] Cleared all provider cache`);
  }
}

function normalizeProviderValue(providerValue: string): string {
  const v = (providerValue || '').toLowerCase().trim();
  const aliases: Record<string, string> = {
    modflix: 'mod',
    moviesmod: 'mod',
    multimovie: 'multi',
    multimovies: 'multi',
    world4ufree: 'world4u',
    hdhub: 'hdhub4u',
  };
  return aliases[v] || v;
}

// Faster module fetch with shorter timeout
async function fetchModuleWithFallback(baseUrl: string, key: string, name: string): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const url = `${baseUrl}/${key}/${name}.js`;
    
    const res = await axios.get(url, {
      timeout: 8000, // Reduced from 15s to 8s for faster failure
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HubD4u/1.0)',
        'Accept': 'text/javascript,application/javascript,*/*'
      }
    });
    
    if (res.status === 200 && res.data && typeof res.data === 'string') {
      return { success: true, data: res.data };
    } else {
      return { success: false, error: `Invalid response: ${res.status}` };
    }
  } catch (err: any) {
    const errorMsg = err.response?.status ? `HTTP ${err.response.status}` : err.message;
    return { success: false, error: errorMsg };
  }
}

// Parallel module fetching for faster loading
async function fetchAllModulesParallel(key: string): Promise<ProviderModules> {
  const modules: ProviderModules = {};
  const moduleNames = ['posts', 'meta', 'stream', 'catalog', 'episodes'] as const;
  
  // Fetch all modules in parallel from first URL
  const primaryUrl = BASE_URLS[0];
  const results = await Promise.allSettled(
    moduleNames.map(name => fetchModuleWithFallback(primaryUrl, key, name))
  );
  
  // Process results
  const failedModules: typeof moduleNames[number][] = [];
  results.forEach((result, i) => {
    const name = moduleNames[i];
    if (result.status === 'fulfilled' && result.value.success && result.value.data) {
      (modules as any)[name] = result.value.data;
    } else {
      failedModules.push(name);
    }
  });
  
  // Retry failed modules with fallback URLs
  if (failedModules.length > 0) {
    for (const fallbackUrl of BASE_URLS.slice(1)) {
      if (failedModules.length === 0) break;
      
      const retryResults = await Promise.allSettled(
        failedModules.map(name => fetchModuleWithFallback(fallbackUrl, key, name))
      );
      
      const stillFailed: typeof moduleNames[number][] = [];
      retryResults.forEach((result, i) => {
        const name = failedModules[i];
        if (result.status === 'fulfilled' && result.value.success && result.value.data) {
          (modules as any)[name] = result.value.data;
        } else {
          stillFailed.push(name);
        }
      });
      
      failedModules.length = 0;
      failedModules.push(...stillFailed);
    }
  }
  
  return modules;
}

export async function fetchProviderModule(
  providerValue: string,
  moduleName: ProviderModuleName,
): Promise<string | undefined> {
  const key = normalizeProviderValue(providerValue);
  const cached = memoryCache.get(key);
  if (cached?.modules?.[moduleName] && Date.now() - cached.ts < CACHE_MS) {
    return cached.modules[moduleName];
  }

  // Fast single fetch across fallback base URLs
  for (const baseUrl of BASE_URLS) {
    const res = await fetchModuleWithFallback(baseUrl, key, moduleName);
    if (res.success && res.data) {
      const existing = memoryCache.get(key) || { modules: {}, ts: Date.now() };
      existing.modules[moduleName] = res.data;
      existing.ts = Date.now();
      memoryCache.set(key, existing);
      return res.data;
    }
  }
  return undefined;
}

export async function fetchProviderModules(
  providerValue: string,
): Promise<ProviderModules> {
  const key = normalizeProviderValue(providerValue);
  
  // Check cache first
  const cached = memoryCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_MS) {
    console.log(`[PROVIDER-LOADER] Cache hit for: ${key}`);
    return cached.modules;
  }

  console.log(`[PROVIDER-LOADER] Fetching modules for: ${key}`);
  const startTime = Date.now();
  
  // Use parallel fetching for speed
  const modules = await fetchAllModulesParallel(key);
  
  console.log(`[PROVIDER-LOADER] Loaded ${Object.keys(modules).length} modules in ${Date.now() - startTime}ms`);
  
  memoryCache.set(key, {modules, ts: Date.now()});
  return modules;
}


