import {NextRequest, NextResponse} from 'next/server';
import {fetchProviderModules, clearProviderCache} from '@/server/providerLoader';
import {executeModule} from '@/server/providerExecutor';
import {providerContext} from '@/server/providerContext';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const {searchParams} = new URL(req.url);
    const providerValue = searchParams.get('provider') || 'vega';
    const action = searchParams.get('action') || 'info';
    
    console.log(`[TEST-PROVIDER] Request: provider=${providerValue}, action=${action}`);
    
    // Fetch provider modules
    const modules = await fetchProviderModules(providerValue);
    console.log(`[TEST-PROVIDER] Modules loaded:`, Object.keys(modules));
    
    if (action === 'info') {
      // Return basic module information
      return NextResponse.json({
        provider: providerValue,
        modules: Object.keys(modules),
        moduleSizes: Object.fromEntries(
          Object.entries(modules).map(([key, value]) => [key, value?.length || 0])
        ),
        providerContext: {
          available: Object.keys(providerContext),
          extractors: Object.keys(providerContext.extractors),
          headers: Object.keys(providerContext.commonHeaders)
        }
      });
    }
    
    if (action === 'test-stream') {
      // Test the stream module specifically
      if (!modules.stream) {
        return NextResponse.json({error: 'No stream module available'}, {status: 500});
      }
      
      const streamModule = executeModule(modules.stream);
      console.log(`[TEST-PROVIDER] Stream module executed:`, typeof streamModule);
      
      // Check what functions are available
      const availableFunctions = Object.keys(streamModule).filter(key => 
        typeof (streamModule as any)[key] === 'function'
      );
      
      // Check if there are any test/debug functions
      const testFunctions = availableFunctions.filter(name => 
        name.toLowerCase().includes('test') || 
        name.toLowerCase().includes('debug') || 
        name.toLowerCase().includes('info')
      );
      
      return NextResponse.json({
        provider: providerValue,
        moduleType: typeof streamModule,
        availableFunctions,
        testFunctions,
        hasGetStream: typeof (streamModule as any).getStream === 'function',
        moduleKeys: Object.keys(streamModule)
      });
    }
    
    if (action === 'execute-test') {
      // Try to execute a test function if available
      if (!modules.stream) {
        return NextResponse.json({error: 'No stream module available'}, {status: 500});
      }
      
      const streamModule = executeModule(modules.stream);
      
      // Look for test functions
      const testFn = (streamModule as any).test || 
                    (streamModule as any).debug || 
                    (streamModule as any).getInfo ||
                    (streamModule as any).info;
      
      if (!testFn || typeof testFn !== 'function') {
        return NextResponse.json({
          error: 'No test function available',
          availableFunctions: Object.keys(streamModule).filter(key => 
            typeof (streamModule as any)[key] === 'function'
          )
        }, {status: 400});
      }
      
      try {
        console.log(`[TEST-PROVIDER] Executing test function: ${testFn.name || 'anonymous'}`);
        const result = await testFn({ providerContext });
        
        return NextResponse.json({
          success: true,
          testFunction: testFn.name || 'anonymous',
          result: result,
          resultType: typeof result
        });
      } catch (error: any) {
        return NextResponse.json({
          success: false,
          error: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, {status: 500});
      }
    }
    
    if (action === 'clear-cache') {
      clearProviderCache(providerValue);
      return NextResponse.json({
        success: true,
        message: `Cache cleared for provider: ${providerValue}`
      });
    }
    
    return NextResponse.json({
      error: 'Invalid action',
      availableActions: ['info', 'test-stream', 'execute-test', 'clear-cache']
    }, {status: 400});
    
  } catch (error: any) {
    console.error(`[TEST-PROVIDER] Error:`, error);
    return NextResponse.json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, {status: 500});
  }
}
