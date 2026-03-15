'use client';

import { CartItem } from '@/types';
import { formatEUR } from '@/lib/flavors';

interface ActiveFlavor { id: string; name: string; priceEurCents: number; index: number }

interface Props {
  cartItems: CartItem[];
  activeFlavors: ActiveFlavor[];
  totalUnits: number;
  subtotalCents: number;
  freightCents: number;
  grandTotalCents: number;
  minOrderCents: number;
  onProceed: () => void;
}

export default function DesktopSidebar({ cartItems, activeFlavors, totalUnits, subtotalCents, freightCents, grandTotalCents, minOrderCents, onProceed }: Props) {
  const canProceed = subtotalCents >= minOrderCents;
  const remaining = Math.max(0, minOrderCents - subtotalCents);

  return (
    <div className="hidden lg:block w-80 shrink-0">
      <div className="sticky top-24 card p-5">
        <h3 className="font-bold text-lg text-gray-900 mb-4">🛒 Resumo do Pedido</h3>
        {cartItems.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">Nenhum sabor selecionado ainda.</p>
        ) : (
          <ul className="space-y-2 mb-4 max-h-64 overflow-y-auto">
            {cartItems.map((item) => {
              const flavor = activeFlavors.find((f) => f.id === item.flavorId);
              return (
                <li key={item.flavorId} className="flex justify-between text-sm">
                  <span className="text-gray-700 line-clamp-1 flex-1">{item.flavorName}</span>
                  <span className="font-semibold text-gray-900 ml-2 shrink-0">
                    × {item.quantity} = {formatEUR((flavor?.priceEurCents ?? 170) * item.quantity)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <div className="border-t border-gray-100 pt-4 space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal ({totalUnits} un.)</span>
            <span className="font-semibold">{formatEUR(subtotalCents)}</span>
          </div>
          {freightCents > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>Frete</span>
              <span className="font-semibold">{formatEUR(freightCents)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t border-gray-100 pt-2">
            <span>Total</span>
            <span className="text-brand-600">{formatEUR(grandTotalCents)}</span>
          </div>
        </div>
        {!canProceed && totalUnits > 0 && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2 mt-3 text-center">
            Faltam <strong>{formatEUR(remaining)}</strong> para o pedido mínimo
          </p>
        )}
        {totalUnits === 0 && (
          <p className="text-xs text-gray-400 mt-3 text-center">Mínimo: {formatEUR(minOrderCents)}</p>
        )}
        <button onClick={onProceed} disabled={!canProceed} className="btn-primary w-full mt-4 text-center">
          Finalizar pedido →
        </button>
      </div>
    </div>
  );
}
