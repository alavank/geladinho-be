import { Flavor } from '@/types';

export const UNIT_PRICE_CENTS = 170; // € 1,70
export const MIN_ORDER_UNITS = 50;

export const FLAVORS: Flavor[] = [
  { id: 'morango', name: 'Morango', emoji: '🍓', color: 'from-red-400 to-pink-500' },
  { id: 'uva', name: 'Uva', emoji: '🍇', color: 'from-purple-500 to-violet-600' },
  { id: 'limao', name: 'Limão', emoji: '🍋', color: 'from-yellow-300 to-lime-400' },
  { id: 'maracuja', name: 'Maracujá', emoji: '🟡', color: 'from-yellow-400 to-orange-400' },
  { id: 'coco', name: 'Coco', emoji: '🥥', color: 'from-amber-100 to-yellow-200' },
  { id: 'chocolate', name: 'Chocolate', emoji: '🍫', color: 'from-amber-700 to-yellow-800' },
  { id: 'ninho-nutella', name: 'Ninho com Nutella', emoji: '🌰', color: 'from-amber-300 to-amber-500' },
  { id: 'abacaxi', name: 'Abacaxi', emoji: '🍍', color: 'from-yellow-300 to-green-400' },
  { id: 'acai', name: 'Açaí', emoji: '🫐', color: 'from-purple-700 to-indigo-800' },
  { id: 'manga', name: 'Manga', emoji: '🥭', color: 'from-orange-300 to-yellow-400' },
  { id: 'melancia', name: 'Melancia', emoji: '🍉', color: 'from-red-400 to-green-500' },
  { id: 'goiaba', name: 'Goiaba', emoji: '🩷', color: 'from-pink-300 to-rose-400' },
  { id: 'tamarindo', name: 'Tamarindo', emoji: '🟤', color: 'from-amber-600 to-brown-600' },
  { id: 'caju', name: 'Caju', emoji: '🟠', color: 'from-orange-400 to-red-400' },
  { id: 'amendoim', name: 'Amendoim', emoji: '🥜', color: 'from-amber-400 to-yellow-500' },
  { id: 'baunilha', name: 'Baunilha', emoji: '🤍', color: 'from-yellow-50 to-amber-100' },
  { id: 'morango-leite-cond', name: 'Morango com Leite Condensado', emoji: '🍓', color: 'from-pink-300 to-red-300' },
  { id: 'maracuja-cream', name: 'Maracujá com Cream Cheese', emoji: '🍮', color: 'from-yellow-200 to-orange-300' },
  { id: 'limao-ninho', name: 'Limão com Ninho', emoji: '🍋', color: 'from-lime-300 to-yellow-300' },
  { id: 'chocolate-menta', name: 'Chocolate com Menta', emoji: '🍃', color: 'from-green-400 to-emerald-600' },
  { id: 'cereja', name: 'Cereja', emoji: '🍒', color: 'from-red-500 to-rose-600' },
  { id: 'brigadeiro', name: 'Brigadeiro', emoji: '⚽', color: 'from-amber-800 to-yellow-700' },
  { id: 'cupuacu', name: 'Cupuaçu', emoji: '🌿', color: 'from-green-600 to-teal-600' },
  { id: 'graviola', name: 'Graviola', emoji: '🌳', color: 'from-green-300 to-lime-400' },
  { id: 'pitanga', name: 'Pitanga', emoji: '🔴', color: 'from-red-500 to-orange-500' },
  { id: 'siriguela', name: 'Siriguela', emoji: '🟣', color: 'from-purple-400 to-pink-500' },
  { id: 'acerola', name: 'Acerola', emoji: '❤️', color: 'from-red-400 to-rose-500' },
  { id: 'tangerina', name: 'Tangerina', emoji: '🍊', color: 'from-orange-300 to-orange-500' },
  { id: 'abacate', name: 'Abacate com Leite Cond.', emoji: '🥑', color: 'from-green-400 to-lime-500' },
  { id: 'groselha', name: 'Groselha', emoji: '🍇', color: 'from-red-300 to-purple-400' },
];

export function formatEUR(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}
