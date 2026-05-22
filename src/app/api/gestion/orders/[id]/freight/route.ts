import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { UpdateFreightSchema } from '@/lib/schemas';
import { sendFreightUpdateNotification } from '@/lib/telegram';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  const body = await request.json();
  const parsed = UpdateFreightSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });
  }

  const newFreightCents = parsed.data.freightEurCents;

  const { error } = await supabaseAdmin
    .from('orders')
    .update({ freight_eur_cents: newFreightCents })
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: 'Erro ao atualizar frete' }, { status: 500 });
  }

  // Send updated Telegram notification for B2B orders with freight > 0
  if (newFreightCents > 0) {
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', params.id)
      .single();

    if (order) {
      const { data: items } = await supabaseAdmin
        .from('order_items')
        .select('*')
        .eq('order_id', params.id);

      await sendFreightUpdateNotification(order, items || [], newFreightCents);
    }
  }

  return NextResponse.json({ ok: true });
}
