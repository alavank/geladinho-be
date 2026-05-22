import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.color !== undefined) updates.color = body.color;
  if (body.icon !== undefined) updates.icon = body.icon;
  if (body.active !== undefined) updates.active = body.active;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('expense_categories')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Erro ao atualizar categoria' }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  // Check if category has expenses
  const { count } = await supabaseAdmin
    .from('expenses')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', params.id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Não é possível excluir: ${count} gasto(s) vinculado(s) a esta categoria` },
      { status: 409 }
    );
  }

  const { error } = await supabaseAdmin
    .from('expense_categories')
    .delete()
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: 'Erro ao excluir categoria' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
