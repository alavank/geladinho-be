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

    if (data.flavor_configs && Array.isArray(data.flavor_configs)) {
      return {
        flavorConfigs: data.flavor_configs,
        freightEurCents: data.freight_eur_cents ?? 0,
        minOrderEurCents: data.min_order_eur_cents ?? 8500,
      };
    }

    return getDefaultSettings();
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
    updated_at: new Date().toISOString(),
  });
}
