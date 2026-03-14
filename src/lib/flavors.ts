export const UNIT_PRICE_CENTS = 170; // € 1,70
export const MIN_ORDER_UNITS = 50;

export interface Flavor {
  id: string;
  name: string;
}

export const FLAVORS: Flavor[] = [
  { id: 'abacate', name: 'ABACATE' },
  { id: 'abacaxi-cremoso', name: 'ABACAXI CREMOSO' },
  { id: 'acai', name: 'AÇAÍ' },
  { id: 'amendoim', name: 'AMENDOIM' },
  { id: 'blue-ice', name: 'BLUE ICE' },
  { id: 'caja', name: 'CAJÁ' },
  { id: 'chocotella', name: 'CHOCOTELLA' },
  { id: 'coco', name: 'CÔCO' },
  { id: 'coco-queimado', name: 'CÔCO QUEIMADO' },
  { id: 'creme-milho', name: 'CREME DE MILHO' },
  { id: 'cupuacu', name: 'CUPUAÇÚ' },
  { id: 'flocos', name: 'FLOCOS' },
  { id: 'laka-flocado', name: 'LAKA FLOCADO' },
  { id: 'leite-condensado', name: 'LEITE CONDENSADO' },
  { id: 'limao', name: 'LIMÃO' },
  { id: 'manga', name: 'MANGA' },
  { id: 'maracuja', name: 'MARACUJÁ' },
  { id: 'morango', name: 'MORANGO' },
  { id: 'mousse-maracuja', name: 'MOUSSE DE MARACUJÁ' },
  { id: 'ninho-morango', name: 'NINHO COM MORANGO' },
  { id: 'ninho-oreo', name: 'NINHO COM OREO' },
  { id: 'pacoquinha', name: 'PAÇOQUINHA' },
  { id: 'pina-colada', name: 'PIÑA COLADA' },
  { id: 'prestigio', name: 'PRESTÍGIO' },
  { id: 'rocher', name: 'ROCHER' },
  { id: 'romeu-julieta', name: 'ROMEU E JULIETA' },
  { id: 'sonho', name: 'SONHO' },
  { id: 'tropical', name: 'TROPICAL' },
  { id: 'uva', name: 'UVA' },
];

const CARD_COLORS = [
  'bg-pink-100 text-pink-900',
  'bg-purple-100 text-purple-900',
  'bg-blue-100 text-blue-900',
  'bg-teal-100 text-teal-900',
  'bg-green-100 text-green-900',
  'bg-yellow-100 text-yellow-900',
  'bg-orange-100 text-orange-900',
  'bg-red-100 text-red-900',
  'bg-indigo-100 text-indigo-900',
  'bg-cyan-100 text-cyan-900',
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
