'use client';

import { getFlavorColor, formatEUR } from '@/lib/flavors';

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
  const colorClass = getFlavorColor(colorIndex);

  return (
    <div className={`rounded-2xl border-2 transition-all duration-200 flex flex-col overflow-hidden ${
      isSelected ? 'border-brand-500 shadow-lg shadow-brand-100' : 'border-transparent shadow-sm hover:shadow-md'
    }`}>
      <div className={`${colorClass} flex-1 flex flex-col items-center justify-center px-3 py-6 min-h-[100px]`}>
        <p className="font-black text-center leading-tight text-base tracking-wide">{flavorName}</p>
        <p className="text-xs font-semibold mt-2 opacity-70">{formatEUR(unitPriceCents)}</p>
      </div>
      <div className="bg-white px-2 py-2 flex items-center gap-1 border-t border-gray-100">
        <button onClick={() => onQuantityChange(quantity - 1)} disabled={quantity === 0}
          className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-30 font-bold text-gray-700 flex items-center justify-center text-lg transition-colors">−</button>
        <input type="number" min={0} value={quantity}
          onChange={(e) => { const v = parseInt(e.target.value, 10); onQuantityChange(isNaN(v) ? 0 : Math.max(0, v)); }}
          className="flex-1 text-center font-bold text-gray-900 border border-gray-200 rounded-lg py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 min-w-0" />
        <button onClick={() => onQuantityChange(quantity + 1)}
          className="w-8 h-8 rounded-lg bg-brand-100 hover:bg-brand-200 text-brand-700 font-bold flex items-center justify-center text-lg transition-colors">+</button>
      </div>
    </div>
  );
}
