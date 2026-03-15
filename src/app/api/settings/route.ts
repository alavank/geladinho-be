import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/settings-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json(settings, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch {
    return NextResponse.json({ error: 'Erro' }, { status: 500 });
  }
}
