import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  const url = new URL(request.url);
  const categoryId = url.searchParams.get('category_id');
  const supplierId = url.searchParams.get('supplier_id');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  let query = supabaseAdmin
    .from('expenses')
    .select('*, category:expense_categories(*), supplier:suppliers(*)')
    .order('date', { ascending: false });

  if (categoryId) query = query.eq('category_id', categoryId);
  if (supplierId) query = query.eq('supplier_id', supplierId);
  if (from) query = query.gte('date', from);
  if (to) query = query.lte('date', to);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Erro ao buscar gastos' }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  const body = await request.json();
  const { date, category_id, supplier_id, description, amount_eur_cents, receipt_image_url, ocr_raw_data, notes } = body;

  if (!category_id) {
    return NextResponse.json({ error: 'Categoria é obrigatória' }, { status: 400 });
  }
  if (!description?.trim()) {
    return NextResponse.json({ error: 'Descrição é obrigatória' }, { status: 400 });
  }
  if (!amount_eur_cents || amount_eur_cents <= 0) {
    return NextResponse.json({ error: 'Valor deve ser maior que zero' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('expenses')
    .insert({
      date: date || new Date().toISOString().split('T')[0],
      category_id,
      supplier_id: supplier_id || null,
      description: description.trim(),
      amount_eur_cents: Math.round(amount_eur_cents),
      receipt_image_url: receipt_image_url || null,
      ocr_raw_data: ocr_raw_data || null,
      notes: notes?.trim() || null,
    })
    .select('*, category:expense_categories(*), supplier:suppliers(*)')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Erro ao criar gasto' }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
