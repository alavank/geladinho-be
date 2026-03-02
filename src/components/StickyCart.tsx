'use client';

import { formatEUR } from '@/lib/flavors';
import { MIN_ORDER_UNITS } from '@/lib/flavors';

interface Props {
  totalUnits: number;
  totalCents: number;
  onProceed: () => void;
}

export default function StickyCart({ totalUnits, totalCents, onProceed }: Props) {
  const canProceed = totalUnits >= MIN_ORDER_UNITS;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-2xl">
      <div className="px-4 py-3">
        {!canProceed && totalUnits > 0 && (
          <p className="text-xs text-amber-600 text-center mb-2 font-medium">
            Faltam {MIN_ORDER_UNITS - totalUnits} geladinhos para o mínimo
          </p>
        )}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm text-gray-500">
              <span className="font-bold text-gray-900">{totalUnits}</span> geladinhos
            </p>
            <p className="text-lg font-bold text-brand-600">
              Total: {formatEUR(totalCents)}
            </p>
          </div>
          <button
            onClick={onProceed}
            disabled={!canProceed}
            className="btn-primary whitespace-nowrap text-sm"
          >
            Finalizar pedido →
          </button>
        </div>
      </div>
      {/* Safe area spacer for iOS */}
      <div className="h-safe-area-inset-bottom" />
    </div>
  );
}
