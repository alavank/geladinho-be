import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.address !== undefined) updates.address = body.address?.trim() || null;
  if (body.phone !== undefined) updates.phone = body.phone?.trim() || null;
  if (body.notes !== undefined) updates.notes = body.notes?.trim() || null;
  if (body.active !== undefined) updates.active = body.active;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('suppliers')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Erro ao atualizar fornecedor' }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  // Check if supplier has expenses
  const { count } = await supabaseAdmin
    .from('expenses')
    .select('*', { count: 'exact', head: true })
    .eq('supplier_id', params.id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Não é possível excluir: ${count} gasto(s) vinculado(s) a este fornecedor` },
      { status: 409 }
    );
  }

  const { error } = await supabaseAdmin
    .from('suppliers')
    .delete()
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: 'Erro ao excluir fornecedor' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
