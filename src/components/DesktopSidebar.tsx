'use client';

import { CartItem } from '@/types';
import { formatEUR, MIN_ORDER_UNITS } from '@/lib/flavors';

interface Props {
  cartItems: CartItem[];
  totalUnits: number;
  totalCents: number;
  onProceed: () => void;
}

export default function DesktopSidebar({ cartItems, totalUnits, totalCents, onProceed }: Props) {
  const canProceed = totalUnits >= MIN_ORDER_UNITS;
  const remaining = Math.max(0, MIN_ORDER_UNITS - totalUnits);

  return (
    <div className="hidden lg:block w-80 shrink-0">
      <div className="sticky top-24 card p-5">
        <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
          🛒 Resumo do Pedido
        </h3>

        {cartItems.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">
            Nenhum sabor selecionado ainda.
          </p>
        ) : (
          <ul className="space-y-2 mb-4 max-h-64 overflow-y-auto">
            {cartItems.map((item) => (
              <li key={item.flavorId} className="flex justify-between text-sm">
                <span className="text-gray-700 line-clamp-1 flex-1">{item.flavorName}</span>
                <span className="font-semibold text-gray-900 ml-2 shrink-0">
                  × {item.quantity}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-gray-100 pt-4 space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Total de unidades</span>
            <span className="font-semibold">{totalUnits}</span>
          </div>
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span className="text-brand-600">{formatEUR(totalCents)}</span>
          </div>
        </div>

        {!canProceed && totalUnits > 0 && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2 mt-3 text-center">
            Faltam <strong>{remaining}</strong> geladinhos para o pedido mínimo de {MIN_ORDER_UNITS}
          </p>
        )}

        {totalUnits === 0 && (
          <p className="text-xs text-gray-400 mt-3 text-center">
            Mínimo: {MIN_ORDER_UNITS} unidades
          </p>
        )}

        <button
          onClick={onProceed}
          disabled={!canProceed}
          className="btn-primary w-full mt-4 text-center"
        >
          Finalizar pedido →
        </button>
      </div>
    </div>
  );
}
