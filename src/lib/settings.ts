import { supabaseAdmin } from './supabase';
import { FLAVORS } from './flavors';

export interface FlavorConfig {
  id: string;
  active: boolean;
  priceEurCents: number;
}

export interface SystemSettings {
  flavorConfigs: FlavorConfig[];
  freightEurCents: number;
  minOrderEurCents: number;
}

export function getDefaultSettings(): SystemSettings {
  return {
    flavorConfigs: FLAVORS.map((f) => ({
      id: f.id,
      active: true,
      priceEurCents: f.defaultPriceEurCents,
    })),
    freightEurCents: 0,
    minOrderEurCents: 8500,
  };
}

export async function getSettings(): Promise<SystemSettings> {
  try {
    const { data, error } = await supabaseAdmin
      .from('settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error || !data) return getDefaultSettings();

    // If old format (active_flavor_ids), migrate to new format
    if (data.flavor_configs) {
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
