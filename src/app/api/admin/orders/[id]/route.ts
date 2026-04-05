import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/auth';
import { geocodeAddress } from '@/lib/geocoding';
import { normalizeBelgianPhone } from '@/lib/phone';
import { supabaseAdmin } from '@/lib/supabase';
import { OrderStatus } from '@/types';

const VALID_STATUSES: OrderStatus[] = ['novo', 'em_preparo', 'em_rota', 'entregue', 'cancelado'];

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
  }

  const { data: items } = await supabaseAdmin
    .from('order_items')
    .select('*')
    .eq('order_id', params.id);

  return NextResponse.json({ ...order, order_items: items || [] });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  const body = await request.json();

  const { data: currentOrder, error: currentOrderError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', params.id)
    .single();

  if (currentOrderError || !currentOrder) {
    return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    }
    updates.status = body.status;
  }

  if (body.customer_id !== undefined) updates.customer_id = body.customer_id || null;

  if (body.customer_name !== undefined) {
    const customerName = String(body.customer_name || '').trim();
    if (!customerName) {
      return NextResponse.json({ error: 'Nome do cliente é obrigatório' }, { status: 400 });
    }
    updates.customer_name = customerName;
  }

  if (body.establishment_name !== undefined) {
    updates.establishment_name = String(body.establishment_name || '').trim() || null;
  }

  if (body.customer_phone !== undefined || body.customer_phone_e164 !== undefined) {
    const phoneInput = body.customer_phone ?? body.customer_phone_e164 ?? '';
    const normalizedPhone = normalizeBelgianPhone(String(phoneInput));
    if (!normalizedPhone) {
      return NextResponse.json({ error: 'Telefone belga inválido' }, { status: 400 });
    }
    updates.customer_phone_e164 = normalizedPhone;
  }

  if (body.customer_email !== undefined) {
    updates.customer_email = String(body.customer_email || '').trim() || null;
  }

  if (body.notes !== undefined) {
    updates.notes = String(body.notes || '').trim() || null;
  }

  const addressKeys = ['address_street', 'address_number', 'address_postal_code', 'address_city', 'address_country'] as const;
  for (const key of addressKeys) {
    if (body[key] !== undefined) {
      updates[key] = String(body[key] || '').trim();
    }
  }

  const addressChanged = addressKeys.some((key) => body[key] !== undefined);
  if (addressChanged) {
    const finalStreet = String(updates.address_street ?? currentOrder.address_street ?? '').trim();
    const finalNumber = String(updates.address_number ?? currentOrder.address_number ?? '').trim();
    const finalPostalCode = String(updates.address_postal_code ?? currentOrder.address_postal_code ?? '').trim();
    const finalCity = String(updates.address_city ?? currentOrder.address_city ?? '').trim();
    const finalCountry = String(updates.address_country ?? currentOrder.address_country ?? 'Belgium').trim() || 'Belgium';

    if (!finalStreet || !finalNumber || !finalPostalCode || !finalCity) {
      return NextResponse.json({ error: 'Endereço completo é obrigatório para salvar o pedido' }, { status: 400 });
    }

    updates.address_country = finalCountry;

    const geocoded = await geocodeAddress(finalStreet, finalNumber, finalPostalCode, finalCity, finalCountry);
    updates.latitude = geocoded?.lat ?? null;
    updates.longitude = geocoded?.lng ?? null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
  }

  const { data: updatedOrder, error } = await supabaseAdmin
    .from('orders')
    .update(updates)
    .eq('id', params.id)
    .select('*')
    .single();

  if (error || !updatedOrder) {
    return NextResponse.json({ error: 'Erro ao atualizar pedido' }, { status: 500 });
  }

  return NextResponse.json(updatedOrder);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  const { error } = await supabaseAdmin
    .from('orders')
    .delete()
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: 'Erro ao excluir pedido' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
