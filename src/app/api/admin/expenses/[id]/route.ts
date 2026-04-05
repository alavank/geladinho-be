import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  const { data, error } = await supabaseAdmin
    .from('expenses')
    .select('*, category:expense_categories(*), supplier:suppliers(*)')
    .eq('id', params.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Gasto não encontrado' }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.date !== undefined) updates.date = body.date;
  if (body.category_id !== undefined) updates.category_id = body.category_id;
  if (body.supplier_id !== undefined) updates.supplier_id = body.supplier_id || null;
  if (body.description !== undefined) updates.description = body.description.trim();
  if (body.amount_eur_cents !== undefined) updates.amount_eur_cents = Math.round(body.amount_eur_cents);
  if (body.receipt_image_url !== undefined) updates.receipt_image_url = body.receipt_image_url || null;
  if (body.notes !== undefined) updates.notes = body.notes?.trim() || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('expenses')
    .update(updates)
    .eq('id', params.id)
    .select('*, category:expense_categories(*), supplier:suppliers(*)')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Erro ao atualizar gasto' }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  const { error } = await supabaseAdmin
    .from('expenses')
    .delete()
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: 'Erro ao excluir gasto' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
