import { NextRequest, NextResponse } from 'next/server';
import { CreateOrderSchema } from '@/lib/schemas';
import { normalizeBelgianPhone } from '@/lib/phone';
import { supabaseAdmin } from '@/lib/supabase';
import { sendTelegramNotification } from '@/lib/telegram';
import { getSettings } from '@/lib/settings';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const settings = await getSettings();
    const phoneE164 = normalizeBelgianPhone(data.customerPhone)!;

    const totalUnits = data.items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotalCents = totalUnits * settings.unitPriceEurCents;

    if (subtotalCents < settings.minOrderEurCents) {
      const minEur = (settings.minOrderEurCents / 100).toFixed(2).replace('.', ',');
      return NextResponse.json({ error: `Pedido mínimo de € ${minEur}` }, { status: 400 });
    }

    const totalWithFreight = subtotalCents + settings.freightEurCents;

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_name: data.customerName,
        customer_phone_e164: phoneE164,
        address_street: data.addressStreet,
        address_number: data.addressNumber,
        address_unit: null,
        address_postal_code: data.addressPostalCode,
        address_city: data.addressCommune,
        address_country: 'Belgium',
        needs_change: data.needsChange,
        change_amount_eur_cents: data.changeAmountEurCents || null,
        notes: data.notes || null,
        total_units: totalUnits,
        total_price_eur_cents: subtotalCents,
        freight_eur_cents: settings.freightEurCents,
        status: 'novo',
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('Order insert error:', orderError);
      return NextResponse.json({ error: 'Erro ao salvar pedido' }, { status: 500 });
    }

    const itemsToInsert = data.items.map((item) => ({
      order_id: order.id,
      flavor_name: item.flavorName,
      unit_price_eur_cents: settings.unitPriceEurCents,
      quantity: item.quantity,
      line_total_eur_cents: item.quantity * settings.unitPriceEurCents,
    }));

    const { data: insertedItems, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(itemsToInsert)
      .select();

    if (itemsError) console.error('Items insert error:', itemsError);

    const orderForTelegram = { ...order, freight_eur_cents: settings.freightEurCents, total_with_freight: totalWithFreight };
    sendTelegramNotification(orderForTelegram, insertedItems || itemsToInsert.map((i, idx) => ({ id: String(idx), ...i }))).catch(console.error);

    return NextResponse.json({ orderId: order.id }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
