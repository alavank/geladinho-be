'use client';

import { formatEUR } from '@/lib/flavors';

interface Props {
  totalUnits: number;
  subtotalCents: number;
  freightCents: number;
  grandTotalCents: number;
  minOrderCents: number;
  onProceed: () => void;
}

export default function StickyCart({ totalUnits, subtotalCents, freightCents, grandTotalCents, minOrderCents, onProceed }: Props) {
  const canProceed = subtotalCents >= minOrderCents;
  const remaining = minOrderCents - subtotalCents;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-2xl">
      <div className="px-4 py-3">
        {!canProceed && totalUnits > 0 && (
          <p className="text-xs text-amber-600 text-center mb-2 font-medium">
            Faltam {formatEUR(remaining)} para o pedido mínimo
          </p>
        )}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm text-gray-500">
              <span className="font-bold text-gray-900">{totalUnits}</span> geladinhos
            </p>
            <div className="text-lg font-bold text-brand-600">
              {formatEUR(grandTotalCents)}
              {freightCents > 0 && (
                <span className="text-xs font-normal text-gray-400 ml-1">(frete {formatEUR(freightCents)})</span>
              )}
            </div>
          </div>
          <button onClick={onProceed} disabled={!canProceed} className="btn-primary whitespace-nowrap text-sm">
            Finalizar pedido →
          </button>
        </div>
      </div>
    </div>
  );
}
