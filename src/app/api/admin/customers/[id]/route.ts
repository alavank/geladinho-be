import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/auth';
import { normalizeCustomerRecord } from '@/lib/customers';
import { normalizeBelgianPhone } from '@/lib/phone';
import { supabaseAdmin } from '@/lib/supabase';
import { Customer } from '@/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.type !== undefined) updates.type = body.type === 'b2b' ? 'b2b' : 'b2c';
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.establishment_name !== undefined) {
    updates.establishment_name = body.establishment_name?.trim() || null;
  }
  if (body.phone !== undefined) {
    const phone = normalizeBelgianPhone(body.phone || '');
    if (!phone) {
      return NextResponse.json({ error: 'Telefone belga inválido' }, { status: 400 });
    }
    updates.phone_e164 = phone;
  }
  if (body.email !== undefined) updates.email = body.email?.trim() || null;
  if (body.address_full !== undefined) updates.address_full = body.address_full?.trim() || null;
  if (body.address_street !== undefined) updates.address_street = body.address_street?.trim() || null;
  if (body.address_number !== undefined) updates.address_number = body.address_number?.trim() || null;
  if (body.address_postal_code !== undefined) updates.address_postal_code = body.address_postal_code?.trim() || null;
  if (body.address_city !== undefined) updates.address_city = body.address_city?.trim() || null;
  if (body.notes !== undefined) updates.notes = body.notes?.trim() || null;
  if (body.active !== undefined) updates.active = body.active;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('customers')
    .update(updates)
    .eq('id', params.id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Erro ao atualizar cliente' }, { status: 500 });
  }

  return NextResponse.json(normalizeCustomerRecord(data as Customer));
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  const { count } = await supabaseAdmin
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('customer_id', params.id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Não é possível excluir: ${count} pedido(s) vinculado(s) a este cliente` },
      { status: 409 }
    );
  }

  const { error } = await supabaseAdmin
    .from('customers')
    .delete()
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: 'Erro ao excluir cliente' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
