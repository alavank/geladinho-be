import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

const PROTECTED_KEYS = ['novo', 'em_preparo', 'em_rota', 'entregue', 'cancelado'];

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  if (PROTECTED_KEYS.includes(params.id)) {
    return NextResponse.json({ error: 'Status padrão não pode ser excluído' }, { status: 400 });
  }

  // Check if any order uses this status
  const { count } = await supabaseAdmin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('status', params.id);

  if (count && count > 0) {
    return NextResponse.json({ error: `Existem ${count} pedido(s) com este status. Altere-os antes de excluir.` }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('order_status_configs')
    .delete()
    .eq('key', params.id);

  if (error) return NextResponse.json({ error: 'Erro ao excluir status' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.label !== undefined) updates.label = body.label.trim();
  if (body.color !== undefined) updates.color = body.color;
  if (body.sort_order !== undefined) updates.sort_order = Number(body.sort_order) || 0;
  if (body.active !== undefined) updates.active = body.active;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('order_status_configs')
    .update(updates)
    .eq('key', params.id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Erro ao atualizar status de pedido' }, { status: 500 });
  }

  return NextResponse.json(data);
}
