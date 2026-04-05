import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/auth';
import { DEFAULT_ORDER_STATUS_CONFIGS } from '@/lib/orders';
import { supabaseAdmin } from '@/lib/supabase';
import { OrderStatusConfig } from '@/types';

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  const { data, error } = await supabaseAdmin
    .from('order_status_configs')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Erro ao buscar status de pedido' }, { status: 500 });
  }

  const configs = ((data || []) as OrderStatusConfig[]);
  if (configs.length === 0) {
    return NextResponse.json(DEFAULT_ORDER_STATUS_CONFIGS);
  }

  return NextResponse.json(configs);
}
