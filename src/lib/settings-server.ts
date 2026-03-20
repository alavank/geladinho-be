import { supabaseAdmin } from './supabase';
import { getDefaultSettings, SystemSettings } from './settings';

export async function getSettings(): Promise<SystemSettings> {
  try {
    const { data, error } = await supabaseAdmin
      .from('settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error || !data) return getDefaultSettings();

    return {
      flavorConfigs: data.flavor_configs ?? [],
      freightEurCents: data.freight_eur_cents ?? 0,
      minOrderEurCents: data.min_order_eur_cents ?? 5000,
      b2bFlavorConfigs: data.b2b_flavor_configs ?? [],
      b2bFreightEurCents: data.b2b_freight_eur_cents ?? 0,
      b2bMinTotalUnits: data.b2b_min_total_units ?? 100,
      b2bMinPerFlavor: data.b2b_min_per_flavor ?? 5,
    };
  } catch {
    return getDefaultSettings();
  }
}

export async function saveSettings(settings: SystemSettings): Promise<void> {
  await supabaseAdmin.from('settings').upsert({
    id: 1,
    flavor_configs: settings.flavorConfigs,
    freight_eur_cents: settings.freightEurCents,
    min_order_eur_cents: settings.minOrderEurCents,
    b2b_flavor_configs: settings.b2bFlavorConfigs,
    b2b_freight_eur_cents: settings.b2bFreightEurCents,
    b2b_min_total_units: settings.b2bMinTotalUnits,
    b2b_min_per_flavor: settings.b2bMinPerFlavor,
    updated_at: new Date().toISOString(),
  });
}
