export interface Flavor {
  id: string;
  name: string;
  defaultPriceEurCents: number;
}

export const FLAVORS: Flavor[] = [
  { id: 'abacate', name: 'ABACATE', defaultPriceEurCents: 170 },
  { id: 'abacaxi-cremoso', name: 'ABACAXI CREMOSO', defaultPriceEurCents: 170 },
  { id: 'acai', name: 'AÇAÍ', defaultPriceEurCents: 170 },
  { id: 'amendoim', name: 'AMENDOIM', defaultPriceEurCents: 170 },
  { id: 'blue-ice', name: 'BLUE ICE', defaultPriceEurCents: 170 },
  { id: 'caja', name: 'CAJÁ', defaultPriceEurCents: 170 },
  { id: 'chocotella', name: 'CHOCOTELLA', defaultPriceEurCents: 170 },
  { id: 'coco', name: 'CÔCO', defaultPriceEurCents: 170 },
  { id: 'coco-queimado', name: 'CÔCO QUEIMADO', defaultPriceEurCents: 170 },
  { id: 'creme-milho', name: 'CREME DE MILHO', defaultPriceEurCents: 170 },
  { id: 'cupuacu', name: 'CUPUAÇÚ', defaultPriceEurCents: 170 },
  { id: 'flocos', name: 'FLOCOS', defaultPriceEurCents: 170 },
  { id: 'laka-flocado', name: 'LAKA FLOCADO', defaultPriceEurCents: 170 },
  { id: 'leite-condensado', name: 'LEITE CONDENSADO', defaultPriceEurCents: 170 },
  { id: 'limao', name: 'LIMÃO', defaultPriceEurCents: 170 },
  { id: 'manga', name: 'MANGA', defaultPriceEurCents: 170 },
  { id: 'maracuja', name: 'MARACUJÁ', defaultPriceEurCents: 170 },
  { id: 'morango', name: 'MORANGO', defaultPriceEurCents: 170 },
  { id: 'mousse-maracuja', name: 'MOUSSE DE MARACUJÁ', defaultPriceEurCents: 170 },
  { id: 'ninho-morango', name: 'NINHO COM MORANGO', defaultPriceEurCents: 170 },
  { id: 'ninho-oreo', name: 'NINHO COM OREO', defaultPriceEurCents: 170 },
  { id: 'pacoquinha', name: 'PAÇOQUINHA', defaultPriceEurCents: 170 },
  { id: 'pina-colada', name: 'PIÑA COLADA', defaultPriceEurCents: 170 },
  { id: 'prestigio', name: 'PRESTÍGIO', defaultPriceEurCents: 170 },
  { id: 'rocher', name: 'ROCHER', defaultPriceEurCents: 170 },
  { id: 'romeu-julieta', name: 'ROMEU E JULIETA', defaultPriceEurCents: 170 },
  { id: 'sonho', name: 'SONHO', defaultPriceEurCents: 170 },
  { id: 'tropical', name: 'TROPICAL', defaultPriceEurCents: 170 },
  { id: 'uva', name: 'UVA', defaultPriceEurCents: 170 },
];

// Pastel colors — no green/teal
const CARD_COLORS = [
  'bg-pink-100 text-pink-900',
  'bg-rose-100 text-rose-900',
  'bg-fuchsia-100 text-fuchsia-900',
  'bg-purple-100 text-purple-900',
  'bg-violet-100 text-violet-900',
  'bg-blue-100 text-blue-900',
  'bg-sky-100 text-sky-900',
  'bg-indigo-100 text-indigo-900',
  'bg-amber-100 text-amber-900',
  'bg-orange-100 text-orange-900',
  'bg-yellow-100 text-yellow-900',
  'bg-red-100 text-red-900',
  'bg-pink-200 text-pink-900',
  'bg-purple-200 text-purple-900',
  'bg-blue-200 text-blue-900',
  'bg-amber-200 text-amber-900',
  'bg-rose-200 text-rose-900',
  'bg-violet-200 text-violet-900',
  'bg-sky-200 text-sky-900',
  'bg-indigo-200 text-indigo-900',
  'bg-fuchsia-200 text-fuchsia-900',
  'bg-orange-200 text-orange-900',
  'bg-yellow-200 text-yellow-900',
  'bg-red-200 text-red-900',
  'bg-pink-300 text-pink-900',
  'bg-purple-300 text-purple-900',
  'bg-blue-300 text-blue-900',
  'bg-amber-300 text-amber-900',
  'bg-rose-300 text-rose-900',
];

export function getFlavorColor(index: number): string {
  return CARD_COLORS[index % CARD_COLORS.length];
}

export function formatEUR(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}
