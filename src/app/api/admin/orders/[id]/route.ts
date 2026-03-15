import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
  }

  const { data: items } = await supabaseAdmin
    .from('order_items')
    .select('*')
    .eq('order_id', params.id);

  return NextResponse.json({ ...order, order_items: items || [] });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  const body = await request.json();

  const { error } = await supabaseAdmin
    .from('orders')
    .update({ status: body.status })
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: 'Erro ao atualizar status' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  // order_items are deleted via CASCADE
  const { error } = await supabaseAdmin
    .from('orders')
    .delete()
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: 'Erro ao excluir pedido' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
