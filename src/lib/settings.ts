import { FLAVORS } from './flavors';

export interface FlavorConfig {
  id: string;
  name: string;
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
      name: f.name,
      active: true,
      priceEurCents: f.defaultPriceEurCents,
    })),
    freightEurCents: 0,
    minOrderEurCents: 8500,
  };
}
