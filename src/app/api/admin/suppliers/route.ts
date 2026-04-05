import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  const { data, error } = await supabaseAdmin
    .from('suppliers')
    .select('*')
    .order('name');

  if (error) {
    return NextResponse.json({ error: 'Erro ao buscar fornecedores' }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  const body = await request.json();
  const { name, address, phone, notes } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('suppliers')
    .insert({
      name: name.trim(),
      address: address?.trim() || null,
      phone: phone?.trim() || null,
      notes: notes?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Erro ao criar fornecedor' }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
