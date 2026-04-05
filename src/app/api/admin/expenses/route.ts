import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/auth';
import {
  buildExpenseDescription,
  coerceExpenseItems,
  normalizeExpenseItems,
  sumExpenseItems,
} from '@/lib/expenses';
import { supabaseAdmin } from '@/lib/supabase';
import { Expense, ExpenseItem } from '@/types';

function normalizeExpenseRecord(expense: Expense): Expense {
  return {
    ...expense,
    invoice_number: expense.invoice_number || null,
    location_address: expense.location_address || null,
    items: coerceExpenseItems(
      expense.items,
      expense.description,
      expense.amount_eur_cents
    ),
  };
}

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

  return NextResponse.json(
    (data || []).map((expense) => normalizeExpenseRecord(expense as Expense))
  );
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  const body = await request.json();
  const items = normalizeExpenseItems(
    Array.isArray(body.items) ? (body.items as ExpenseItem[]) : []
  );
  const computedTotal = sumExpenseItems(items);
  const amountCents =
    typeof body.amount_eur_cents === 'number' && body.amount_eur_cents > 0
      ? Math.round(body.amount_eur_cents)
      : computedTotal;
  const description = body.description?.trim() || buildExpenseDescription(items);

  if (!body.category_id) {
    return NextResponse.json({ error: 'Categoria é obrigatória' }, { status: 400 });
  }
  if (items.length === 0) {
    return NextResponse.json({ error: 'Adicione pelo menos um item' }, { status: 400 });
  }
  if (!amountCents || amountCents <= 0) {
    return NextResponse.json({ error: 'Total geral deve ser maior que zero' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('expenses')
    .insert({
      date: body.date || new Date().toISOString().split('T')[0],
      category_id: body.category_id,
      supplier_id: body.supplier_id || null,
      invoice_number: body.invoice_number?.trim() || null,
      location_address: body.location_address?.trim() || null,
      description,
      amount_eur_cents: amountCents,
      receipt_image_url: body.receipt_image_url || null,
      ocr_raw_data: body.ocr_raw_data || null,
      items,
      notes: body.notes?.trim() || null,
    })
    .select('*, category:expense_categories(*), supplier:suppliers(*)')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Erro ao criar gasto' }, { status: 500 });
  }

  return NextResponse.json(normalizeExpenseRecord(data as Expense), { status: 201 });
}
