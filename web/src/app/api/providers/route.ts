import {NextResponse} from 'next/server';
import axios from 'axios';

const MANIFEST_URL =
  'https://raw.githubusercontent.com/Zenda-Cross/vega-providers/refs/heads/main/manifest.json';

export async function GET() {
  try {
    const res = await axios.get(MANIFEST_URL, {timeout: 10000});
    const list = Array.isArray(res.data) ? res.data : [];
    // Filter out disabled providers
    const providers = list
      .filter((p: any) => !p.disabled)
      .map((p: any) => ({
        value: p.value,
        name: p.display_name || p.value,
        type: p.type || 'global',
        icon: p.icon || '',
        version: p.version || '0',
      }));
    return NextResponse.json({providers});
  } catch (e: any) {
    return NextResponse.json({error: e?.message || 'error'}, {status: 500});
  }
}


