import {providerContext} from './providerContext';

// Safe atob that doesn't throw on invalid input
function safeAtob(str: string): string {
  if (!str || typeof str !== 'string') return '';
  try {
    // Clean the string - remove whitespace and fix padding
    const cleaned = str.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    const padded = cleaned + '='.repeat((4 - (cleaned.length % 4)) % 4);
    return Buffer.from(padded, 'base64').toString('utf-8');
  } catch {
    console.warn(`[PROVIDER-EXECUTOR] atob failed for string: ${str.substring(0, 50)}...`);
    return '';
  }
}

// Safe btoa that doesn't throw on invalid input
function safeBtoa(str: string): string {
  if (!str || typeof str !== 'string') return '';
  try {
    return Buffer.from(str, 'utf-8').toString('base64');
  } catch {
    console.warn(`[PROVIDER-EXECUTOR] btoa failed`);
    return '';
  }
}

export function executeModule<T = any>(moduleCode: string, ...args: any[]): T {
  console.log(`[PROVIDER-EXECUTOR] Executing module (${moduleCode.length} chars)`);
  
  const context = {
    exports: {} as any,
    module: {exports: {} as any},
    require: () => ({}),
    console: {
      ...console,
      log: (...args: any[]) => console.log(`[PROVIDER-MODULE]`, ...args),
      error: (...args: any[]) => console.error(`[PROVIDER-MODULE]`, ...args),
      warn: (...args: any[]) => console.warn(`[PROVIDER-MODULE]`, ...args),
    },
    Promise,
    __awaiter: (thisArg: any, _arguments: any, P: any, generator: any) => {
      function adopt(value: any) {
        return value instanceof P
          ? value
          : new P(function (resolve: any) {
              resolve(value);
            });
      }
      return new (P || (P = Promise))(function (resolve: any, reject: any) {
        function fulfilled(value: any) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value: any) {
          try {
            step(generator.throw(value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result: any) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    },
    providerContext,
    atob: safeAtob,
    btoa: safeBtoa,
    Buffer: {
      from: (str: string, encoding?: string) => {
        try {
          return Buffer.from(str, encoding as BufferEncoding);
        } catch {
          return Buffer.from('');
        }
      }
    },
  } as any;

  try {
    const argNames = args.map((_, i) => `arg${i}`).join(', ');
    const fn = new Function(
      'context',
      ...args.map((_, i) => `arg${i}`),
      `const exports = context.exports; const module = context.module; const require = context.require; const providerContext = context.providerContext; const console = context.console; const Promise = context.Promise; const atob = context.atob; const btoa = context.btoa; const Buffer = context.Buffer; ${moduleCode}; return module.exports && Object.keys(module.exports).length ? module.exports : exports;`,
    ) as any;
    
    console.log(`[PROVIDER-EXECUTOR] Function created, executing...`);
    const result = fn(context, ...args);
    console.log(`[PROVIDER-EXECUTOR] Execution result:`, typeof result, result ? Object.keys(result) : 'null/undefined');
    
    return result;
  } catch (error: any) {
    console.error(`[PROVIDER-EXECUTOR] Error executing module:`, error);
    console.error(`[PROVIDER-EXECUTOR] Error stack:`, error?.stack);
    throw error;
  }
}


