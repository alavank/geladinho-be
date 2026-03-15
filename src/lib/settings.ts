import { supabaseAdmin } from './supabase';

export interface SystemSettings {
  activeFlavorIds: string[];
  unitPriceEurCents: number;
  freightEurCents: number;
  minOrderEurCents: number;
}

export const DEFAULT_SETTINGS: SystemSettings = {
  activeFlavorIds: [],
  unitPriceEurCents: 170,
  freightEurCents: 0,
  minOrderEurCents: 8500,
};

export async function getSettings(): Promise<SystemSettings> {
  const { data, error } = await supabaseAdmin
    .from('settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error || !data) return DEFAULT_SETTINGS;

  return {
    activeFlavorIds: data.active_flavor_ids || [],
    unitPriceEurCents: data.unit_price_eur_cents,
    freightEurCents: data.freight_eur_cents,
    minOrderEurCents: data.min_order_eur_cents,
  };
}

export async function saveSettings(settings: SystemSettings): Promise<void> {
  await supabaseAdmin.from('settings').upsert({
    id: 1,
    active_flavor_ids: settings.activeFlavorIds,
    unit_price_eur_cents: settings.unitPriceEurCents,
    freight_eur_cents: settings.freightEurCents,
    min_order_eur_cents: settings.minOrderEurCents,
    updated_at: new Date().toISOString(),
  });
}
