import axios from 'axios';
import * as cheerio from 'cheerio';
import {headers} from './headers';
import {getBaseUrl} from './getBaseUrl';
import {superVideoExtractor} from './extractors/superVideo';
import {gdFlixExtracter} from './extractors/gdflix';
import {hubcloudExtracter} from './extractors/hubcloud';
import {gofileExtracter} from './extractors/gofile';

// Enhanced axios instance with better error handling and logging
const enhancedAxios = axios.create({
  timeout: 30000,
  headers: {
    ...headers,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  }
});

// Add request/response interceptors for debugging
enhancedAxios.interceptors.request.use(
  (config) => {
    console.log(`[PROVIDER-CONTEXT] Making request to: ${config.url}`);
    return config;
  },
  (error) => {
    console.error(`[PROVIDER-CONTEXT] Request error:`, error);
    return Promise.reject(error);
  }
);

enhancedAxios.interceptors.response.use(
  (response) => {
    console.log(`[PROVIDER-CONTEXT] Response from ${response.config.url}: ${response.status}`);
    return response;
  },
  (error) => {
    console.error(`[PROVIDER-CONTEXT] Response error from ${error.config?.url}:`, error.message);
    
    // Handle Cloudflare challenges
    if (error.response?.status === 403 && error.response?.headers?.['cf-mitigated']) {
      console.warn(`[PROVIDER-CONTEXT] Cloudflare challenge detected for ${error.config?.url}`);
      console.warn(`[PROVIDER-CONTEXT] This URL is protected and may require manual intervention`);
    }
    
    return Promise.reject(error);
  }
);

export const providerContext = {
  axios: enhancedAxios,
  getBaseUrl,
  commonHeaders: headers,
  // Node: no expo-crypto; include a compatible subset if needed later
  Crypto: {} as any,
  cheerio,
  extractors: {
    hubcloudExtracter,
    gofileExtracter,
    superVideoExtractor,
    gdFlixExtracter,
  },
  
  // Add debugging utilities
  debug: {
    log: (message: string, data?: any) => {
      console.log(`[PROVIDER-DEBUG] ${message}`, data);
    },
    error: (message: string, error?: any) => {
      console.error(`[PROVIDER-DEBUG] ${message}`, error);
    },
    warn: (message: string, data?: any) => {
      console.warn(`[PROVIDER-DEBUG] ${message}`, data);
    }
  }
};

export type ProviderContext = typeof providerContext;
