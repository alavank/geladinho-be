import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  const { data, error } = await supabaseAdmin
    .from('saved_routes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'Erro ao buscar rotas' }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  const body = await request.json();

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Nome da rota é obrigatório' }, { status: 400 });
  }
  if (!body.order_ids?.length) {
    return NextResponse.json({ error: 'Selecione pelo menos um pedido' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('saved_routes')
    .insert({
      name: body.name.trim(),
      origin: body.origin || 'Rue de la Vérité 45A, 1070 Anderlecht, Belgique',
      order_ids: body.order_ids,
      google_maps_url: body.google_maps_url || null,
      waze_links: body.waze_links || null,
      notes: body.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Erro ao salvar rota' }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
