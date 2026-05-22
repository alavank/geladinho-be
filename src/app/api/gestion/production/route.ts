import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  const { data, error } = await supabaseAdmin
    .from('production_batches')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'Erro ao buscar produções' }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  const body = await request.json();

  if (!body.flavor_id || !body.flavor_name) {
    return NextResponse.json({ error: 'Sabor é obrigatório' }, { status: 400 });
  }
  if (!body.quantity || body.quantity <= 0) {
    return NextResponse.json({ error: 'Quantidade deve ser maior que zero' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('production_batches')
    .insert({
      date: body.date || new Date().toISOString().split('T')[0],
      flavor_id: body.flavor_id,
      flavor_name: body.flavor_name,
      quantity: Math.round(body.quantity),
      notes: body.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Erro ao registrar produção' }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
