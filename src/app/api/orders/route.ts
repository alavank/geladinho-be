import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { normalizeBelgianPhone } from '@/lib/phone';
import { supabaseAdmin } from '@/lib/supabase';
import { sendTelegramNotification } from '@/lib/telegram';
import { getSettings } from '@/lib/settings-server';
import { geocodeAddress } from '@/lib/geocoding';

const OrderItemSchema = z.object({
  flavorId: z.string(),
  flavorName: z.string().min(1),
  quantity: z.number().int().positive(),
});

const CreateOrderSchema = z.object({
  channel: z.enum(['b2c', 'b2b']).default('b2c'),
  // B2C fields
  customerName: z.string().min(2).max(150).optional(),
  // B2B fields
  establishmentName: z.string().min(2).max(200).optional(),
  customerEmail: z.string().email().optional().or(z.literal('')),
  // Common
  customerPhone: z.string().refine(
    (val) => normalizeBelgianPhone(val) !== null,
    'Número de telefone belga inválido'
  ),
  addressStreet: z.string().min(1).max(200),
  addressNumber: z.string().min(1).max(20),
  addressPostalCode: z.string().regex(/^\d{4}$/),
  addressCommune: z.string().min(1).max(100),
  needsChange: z.boolean(),
  changeAmountEurCents: z.number().int().positive().optional(),
  notes: z.string().max(500).optional(),
  items: z.array(OrderItemSchema).min(1),
});

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
    const isB2B = data.channel === 'b2b';

    // Get correct flavor configs
    const flavorConfigs = isB2B ? settings.b2bFlavorConfigs : settings.flavorConfigs;

    // Calculate per-item pricing
    const itemsWithPrice = data.items.map((item) => {
      const fc = flavorConfigs.find((f) => f.id === item.flavorId);
      const price = fc?.priceEurCents ?? (isB2B ? 170 : 250);
      return { ...item, priceEurCents: price, lineTotal: price * item.quantity };
    });

    const totalUnits = itemsWithPrice.reduce((s, i) => s + i.quantity, 0);
    const subtotalCents = itemsWithPrice.reduce((s, i) => s + i.lineTotal, 0);
    const freightCents = isB2B ? settings.b2bFreightEurCents : settings.freightEurCents;

    // B2C validation: minimum order value
    if (!isB2B && subtotalCents < settings.minOrderEurCents) {
      const minEur = (settings.minOrderEurCents / 100).toFixed(2).replace('.', ',');
      return NextResponse.json({ error: `Pedido mínimo de € ${minEur}` }, { status: 400 });
    }

    // B2B validation: minimum total units + minimum per flavor
    if (isB2B) {
      if (totalUnits < settings.b2bMinTotalUnits) {
        return NextResponse.json({ error: `Pedido mínimo de ${settings.b2bMinTotalUnits} unidades para revenda` }, { status: 400 });
      }
      for (const item of itemsWithPrice) {
        if (item.quantity < settings.b2bMinPerFlavor) {
          return NextResponse.json({ error: `Mínimo de ${settings.b2bMinPerFlavor} unidades por sabor (${item.flavorName})` }, { status: 400 });
        }
      }
    }

    // B2B: customer_name = contact person, establishment_name = store name
    // B2C: customer_name = customer full name
    const customerName = isB2B
      ? (data.customerName || data.establishmentName || 'Contato')
      : (data.customerName || 'Cliente');

    // Geocode address (non-blocking — doesn't fail if geocoding fails)
    const coords = await geocodeAddress(
      data.addressStreet, data.addressNumber, data.addressPostalCode, data.addressCommune
    );

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        channel: data.channel,
        customer_name: customerName,
        customer_phone_e164: phoneE164,
        customer_email: data.customerEmail || null,
        establishment_name: data.establishmentName || null,
        address_street: data.addressStreet,
        address_number: data.addressNumber,
        address_unit: null,
        address_postal_code: data.addressPostalCode,
        address_city: data.addressCommune,
        address_country: 'Belgium',
        payment_method: 'dinheiro',
        needs_change: data.needsChange,
        change_amount_eur_cents: data.changeAmountEurCents || null,
        notes: data.notes || null,
        total_units: totalUnits,
        total_price_eur_cents: subtotalCents,
        freight_eur_cents: freightCents,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        status: 'novo',
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('Order insert error:', orderError);
      return NextResponse.json({ error: 'Erro ao salvar pedido' }, { status: 500 });
    }

    const itemsToInsert = itemsWithPrice.map((item) => ({
      order_id: order.id,
      flavor_name: item.flavorName,
      unit_price_eur_cents: item.priceEurCents,
      quantity: item.quantity,
      line_total_eur_cents: item.lineTotal,
    }));

    const { data: insertedItems, error: itemsError } = await supabaseAdmin
      .from('order_items').insert(itemsToInsert).select();

    if (itemsError) console.error('Items insert error:', itemsError);

    sendTelegramNotification(order, insertedItems || itemsToInsert.map((i, idx) => ({ id: String(idx), ...i }))).catch(console.error);

    return NextResponse.json({ orderId: order.id }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
