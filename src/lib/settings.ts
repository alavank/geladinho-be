export interface FlavorConfig {
  id: string;
  name: string;
  active: boolean;
  priceEurCents: number;
}

export interface SystemSettings {
  // B2C
  flavorConfigs: FlavorConfig[];
  freightEurCents: number;
  minOrderEurCents: number;
  // B2B
  b2bFlavorConfigs: FlavorConfig[];
  b2bFreightEurCents: number;
  b2bMinTotalUnits: number;
  b2bMinPerFlavor: number;
}

export function getDefaultSettings(): SystemSettings {
  return {
    flavorConfigs: [],
    freightEurCents: 0,
    minOrderEurCents: 5000,
    b2bFlavorConfigs: [],
    b2bFreightEurCents: 0,
    b2bMinTotalUnits: 100,
    b2bMinPerFlavor: 5,
  };
}
