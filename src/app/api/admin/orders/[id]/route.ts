import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

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
