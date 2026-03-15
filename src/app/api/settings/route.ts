import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/settings';

// Rota pública — o site do cliente precisa carregar as configs
export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: 'Erro ao carregar configurações' }, { status: 500 });
  }
}
