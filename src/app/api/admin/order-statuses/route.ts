import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/auth';
import { DEFAULT_ORDER_STATUS_CONFIGS } from '@/lib/orders';
import { supabaseAdmin } from '@/lib/supabase';
import { OrderStatusConfig } from '@/types';

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  const { data, error } = await supabaseAdmin
    .from('order_status_configs')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Erro ao buscar status de pedido' }, { status: 500 });
  }

  const configs = ((data || []) as OrderStatusConfig[]);
  if (configs.length === 0) {
    return NextResponse.json(DEFAULT_ORDER_STATUS_CONFIGS);
  }

  return NextResponse.json(configs);
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  const body = await request.json();

  if (!body.key?.trim()) {
    return NextResponse.json({ error: 'Chave é obrigatória' }, { status: 400 });
  }
  if (!body.label?.trim()) {
    return NextResponse.json({ error: 'Rótulo é obrigatório' }, { status: 400 });
  }

  // Normalize key: lowercase, underscores, no special chars
  const key = body.key.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  if (!key) {
    return NextResponse.json({ error: 'Chave inválida' }, { status: 400 });
  }

  // Get max sort_order
  const { data: existing } = await supabaseAdmin
    .from('order_status_configs')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);

  const maxSort = existing?.[0]?.sort_order ?? 0;

  const { data, error } = await supabaseAdmin
    .from('order_status_configs')
    .insert({
      key,
      label: body.label.trim(),
      color: body.color || '#6B7280',
      sort_order: body.sort_order ?? maxSort + 1,
      active: true,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Já existe um status com esta chave' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Erro ao criar status' }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
