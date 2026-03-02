import { NextRequest, NextResponse } from 'next/server';
import { CreateOrderSchema } from '@/lib/schemas';
import { normalizeBelgianPhone } from '@/lib/phone';
import { supabaseAdmin } from '@/lib/supabase';
import { sendTelegramNotification } from '@/lib/telegram';
import { UNIT_PRICE_CENTS, MIN_ORDER_UNITS } from '@/lib/flavors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = CreateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Normalize phone
    const phoneE164 = normalizeBelgianPhone(data.customerPhone)!;

    // Calculate totals
    const totalUnits = data.items.reduce((sum, item) => sum + item.quantity, 0);

    if (totalUnits < MIN_ORDER_UNITS) {
      return NextResponse.json(
        { error: `Pedido mínimo de ${MIN_ORDER_UNITS} unidades` },
        { status: 400 }
      );
    }

    const totalCents = totalUnits * UNIT_PRICE_CENTS;

    // Insert order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_name: data.customerName,
        customer_phone_e164: phoneE164,
        address_street: data.addressStreet,
        address_number: data.addressNumber,
        address_unit: data.addressUnit || null,
        address_postal_code: data.addressPostalCode,
        address_city: data.addressCity,
        address_country: 'Belgium',
        payment_method: data.paymentMethod,
        notes: data.notes || null,
        total_units: totalUnits,
        total_price_eur_cents: totalCents,
        status: 'novo',
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('Order insert error:', orderError);
      return NextResponse.json(
        { error: 'Erro ao salvar pedido' },
        { status: 500 }
      );
    }

    // Insert order items
    const itemsToInsert = data.items.map((item) => ({
      order_id: order.id,
      flavor_name: item.flavorName,
      unit_price_eur_cents: UNIT_PRICE_CENTS,
      quantity: item.quantity,
      line_total_eur_cents: item.quantity * UNIT_PRICE_CENTS,
    }));

    const { data: insertedItems, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(itemsToInsert)
      .select();

    if (itemsError) {
      console.error('Items insert error:', itemsError);
      // Order was created, but items failed — still return order
    }

    // Send Telegram notification (non-blocking)
    sendTelegramNotification(order, insertedItems || itemsToInsert.map((i, idx) => ({ id: idx.toString(), ...i }))).catch(console.error);

    return NextResponse.json({ orderId: order.id }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
