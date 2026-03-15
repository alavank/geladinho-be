import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/settings-server';

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: 'Erro ao carregar configurações' }, { status: 500 });
  }
}
