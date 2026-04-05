import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/auth';
import { normalizeCustomerRecord } from '@/lib/customers';
import { normalizeBelgianPhone } from '@/lib/phone';
import { supabaseAdmin } from '@/lib/supabase';
import { Customer, CustomerType } from '@/types';

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  const { data, error } = await supabaseAdmin
    .from('customers')
    .select('*')
    .order('name');

  if (error) {
    return NextResponse.json({ error: 'Erro ao buscar clientes' }, { status: 500 });
  }

  return NextResponse.json((data || []).map((customer) => normalizeCustomerRecord(customer as Customer)));
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  const body = await request.json();
  const phone = normalizeBelgianPhone(body.phone || '');

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
  }
  if (!phone) {
    return NextResponse.json({ error: 'Telefone belga inválido' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('customers')
    .insert({
      type: body.type === 'b2b' ? ('b2b' as CustomerType) : ('b2c' as CustomerType),
      name: body.name.trim(),
      establishment_name: body.establishment_name?.trim() || null,
      phone_e164: phone,
      email: body.email?.trim() || null,
      address_full: body.address_full?.trim() || null,
      address_street: body.address_street?.trim() || null,
      address_number: body.address_number?.trim() || null,
      address_postal_code: body.address_postal_code?.trim() || null,
      address_city: body.address_city?.trim() || null,
      notes: body.notes?.trim() || null,
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Erro ao criar cliente' }, { status: 500 });
  }

  return NextResponse.json(normalizeCustomerRecord(data as Customer), { status: 201 });
}
