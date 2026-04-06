import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, unauthorizedResponse } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { FLAVORS } from '@/lib/flavors';
import { StockLevel } from '@/types';

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) return unauthorizedResponse();

  const [prodRes, adjRes, ordersRes] = await Promise.all([
    supabaseAdmin.from('production_batches').select('flavor_id, flavor_name, quantity'),
    supabaseAdmin.from('stock_adjustments').select('flavor_id, flavor_name, quantity'),
    supabaseAdmin
      .from('order_items')
      .select('flavor_name, quantity, order:orders!inner(status)')
      .neq('order.status', 'cancelado'),
  ]);

  if (prodRes.error || adjRes.error || ordersRes.error) {
    return NextResponse.json({ error: 'Erro ao calcular estoque' }, { status: 500 });
  }

  // Build stock map from all known flavors
  const map: Record<string, StockLevel> = {};
  FLAVORS.forEach((f) => {
    map[f.id] = { flavorId: f.id, flavorName: f.name, produced: 0, sold: 0, adjusted: 0, current: 0 };
  });

  // Add produced quantities
  (prodRes.data || []).forEach((row) => {
    if (!map[row.flavor_id]) {
      map[row.flavor_id] = { flavorId: row.flavor_id, flavorName: row.flavor_name, produced: 0, sold: 0, adjusted: 0, current: 0 };
    }
    map[row.flavor_id].produced += row.quantity;
  });

  // Add adjustments
  (adjRes.data || []).forEach((row) => {
    if (!map[row.flavor_id]) {
      map[row.flavor_id] = { flavorId: row.flavor_id, flavorName: row.flavor_name, produced: 0, sold: 0, adjusted: 0, current: 0 };
    }
    map[row.flavor_id].adjusted += row.quantity;
  });

  // Deduct sold (matched by flavor_name to flavor_id)
  const nameToId: Record<string, string> = {};
  FLAVORS.forEach((f) => { nameToId[f.name] = f.id; });

  (ordersRes.data || []).forEach((row: { flavor_name: string; quantity: number }) => {
    const fId = nameToId[row.flavor_name];
    if (fId && map[fId]) {
      map[fId].sold += row.quantity;
    }
  });

  // Compute current stock
  Object.values(map).forEach((s) => {
    s.current = s.produced + s.adjusted - s.sold;
  });

  // Return only flavors with any activity, sorted by name
  const levels = Object.values(map)
    .filter((s) => s.produced > 0 || s.sold > 0 || s.adjusted !== 0)
    .sort((a, b) => a.flavorName.localeCompare(b.flavorName));

  return NextResponse.json(levels);
}
