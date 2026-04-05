import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  const { data, error } = await supabaseAdmin
    .from('expense_categories')
    .select('*')
    .order('name');

  if (error) {
    return NextResponse.json({ error: 'Erro ao buscar categorias' }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  const body = await request.json();
  const { name, color, icon } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('expense_categories')
    .insert({ name: name.trim(), color: color || '#6B7280', icon: icon || '📦' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Erro ao criar categoria' }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
