'use client';

import { Flavor } from '@/types';
import { formatEUR, UNIT_PRICE_CENTS } from '@/lib/flavors';

interface Props {
  flavor: Flavor;
  quantity: number;
  onQuantityChange: (value: number) => void;
}

export default function FlavorCard({ flavor, quantity, onQuantityChange }: Props) {
  const isSelected = quantity > 0;

  return (
    <div
      className={`card p-3 flex flex-col gap-2 transition-all duration-200 ${
        isSelected ? 'ring-2 ring-brand-400 shadow-md' : 'hover:shadow-md'
      }`}
    >
      {/* Color swatch / image placeholder */}
      <div
        className={`w-full h-20 rounded-xl bg-gradient-to-br ${flavor.color} flex items-center justify-center text-4xl shadow-inner`}
      >
        {flavor.emoji}
      </div>

      {/* Name & price */}
      <div>
        <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
          {flavor.name}
        </p>
        <p className="text-brand-600 font-bold text-sm mt-0.5">
          {formatEUR(UNIT_PRICE_CENTS)}
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 mt-auto">
        <button
          onClick={() => onQuantityChange(quantity - 1)}
          disabled={quantity === 0}
          className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-30 font-bold text-gray-700 flex items-center justify-center text-lg transition-colors"
          aria-label="Diminuir"
        >
          −
        </button>
        <input
          type="number"
          min={0}
          value={quantity}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            onQuantityChange(isNaN(val) ? 0 : val);
          }}
          className="flex-1 text-center font-bold text-gray-900 border border-gray-200 rounded-lg py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 min-w-0"
        />
        <button
          onClick={() => onQuantityChange(quantity + 1)}
          className="w-8 h-8 rounded-lg bg-brand-100 hover:bg-brand-200 text-brand-700 font-bold flex items-center justify-center text-lg transition-colors"
          aria-label="Aumentar"
        >
          +
        </button>
      </div>
    </div>
  );
}
