'use client';

import { formatEUR } from '@/lib/flavors';

// Brand-aligned pastel colors - warm tones matching the red/brown palette
const CARD_COLORS = [
  'bg-red-50 text-red-900 border-red-200',
  'bg-rose-50 text-rose-900 border-rose-200',
  'bg-orange-50 text-orange-900 border-orange-200',
  'bg-amber-50 text-amber-900 border-amber-200',
  'bg-yellow-50 text-yellow-900 border-yellow-200',
  'bg-pink-50 text-pink-900 border-pink-200',
  'bg-red-100 text-red-900 border-red-300',
  'bg-rose-100 text-rose-900 border-rose-300',
  'bg-orange-100 text-orange-900 border-orange-300',
  'bg-amber-100 text-amber-900 border-amber-300',
  'bg-yellow-100 text-yellow-900 border-yellow-300',
  'bg-pink-100 text-pink-900 border-pink-300',
  'bg-red-50 text-red-900 border-red-200',
  'bg-rose-50 text-rose-900 border-rose-200',
  'bg-orange-50 text-orange-900 border-orange-200',
  'bg-amber-50 text-amber-900 border-amber-200',
  'bg-yellow-50 text-yellow-900 border-yellow-200',
  'bg-pink-50 text-pink-900 border-pink-200',
  'bg-red-100 text-red-900 border-red-300',
  'bg-rose-100 text-rose-900 border-rose-300',
  'bg-orange-100 text-orange-900 border-orange-300',
  'bg-amber-100 text-amber-900 border-amber-300',
  'bg-yellow-100 text-yellow-900 border-yellow-300',
  'bg-pink-100 text-pink-900 border-pink-300',
  'bg-red-50 text-red-900 border-red-200',
  'bg-rose-50 text-rose-900 border-rose-200',
  'bg-orange-50 text-orange-900 border-orange-200',
  'bg-amber-50 text-amber-900 border-amber-200',
  'bg-yellow-50 text-yellow-900 border-yellow-200',
];

interface Props {
  flavorId: string;
  flavorName: string;
  colorIndex: number;
  quantity: number;
  unitPriceCents: number;
  onQuantityChange: (value: number) => void;
}

export default function FlavorCard({ flavorName, colorIndex, quantity, unitPriceCents, onQuantityChange }: Props) {
  const isSelected = quantity > 0;
  const colorClass = CARD_COLORS[colorIndex % CARD_COLORS.length];

  return (
    <div className={`rounded-2xl border-2 transition-all duration-200 flex flex-col overflow-hidden ${
      isSelected ? 'border-brand-500 shadow-lg' : 'border-transparent shadow-sm hover:shadow-md'
    }`}>
      <div className={`${colorClass} border flex-1 flex flex-col items-center justify-center px-3 py-6 min-h-[96px]`}>
        <p className="font-black text-center leading-tight text-sm tracking-wide">{flavorName}</p>
        <p className="text-xs font-semibold mt-2 opacity-60">{formatEUR(unitPriceCents)}</p>
      </div>
      <div className="bg-white px-2 py-2 flex items-center gap-1 border-t border-gray-100">
        <button onClick={() => onQuantityChange(quantity - 1)} disabled={quantity === 0}
          className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-30 font-bold text-gray-700 flex items-center justify-center text-lg transition-colors">−</button>
        <input type="number" min={0} value={quantity}
          onChange={(e) => { const v = parseInt(e.target.value, 10); onQuantityChange(isNaN(v) ? 0 : Math.max(0, v)); }}
          className="flex-1 text-center font-bold text-gray-900 border border-gray-200 rounded-lg py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 min-w-0" />
        <button onClick={() => onQuantityChange(quantity + 1)}
          className="w-8 h-8 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-lg transition-colors">+</button>
      </div>
    </div>
  );
}
