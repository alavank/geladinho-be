'use client';

import { FormData } from '@/app/page';
import { CartItem, PAYMENT_METHOD_LABELS } from '@/types';
import { formatEUR } from '@/lib/flavors';

interface Props {
  formData: FormData;
  cartItems: CartItem[];
  totalUnits: number;
  totalCents: number;
  onConfirm: () => void;
  onBack: () => void;
  submitting: boolean;
  error: string;
}

export default function ConfirmModal({
  formData,
  cartItems,
  totalUnits,
  totalCents,
  onConfirm,
  onBack,
  submitting,
  error,
}: Props) {
  const address = [
    `${formData.addressStreet}, ${formData.addressNumber}`,
    formData.addressUnit ? formData.addressUnit : null,
    `${formData.addressPostalCode} ${formData.addressCity}`,
    'Bélgica 🇧🇪',
  ]
    .filter(Boolean)
    .join(' — ');

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">✅ Confirmar Pedido</h2>

      {/* Customer info */}
      <div className="card p-5 mb-4">
        <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide mb-3">
          Dados do Cliente
        </h3>
        <dl className="space-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="text-gray-500 w-24 shrink-0">Nome:</dt>
            <dd className="font-semibold text-gray-900">{formData.customerName}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-gray-500 w-24 shrink-0">Telefone:</dt>
            <dd className="font-semibold text-gray-900">
              {formData.customerPhone}{' '}
              <span className="text-green-600 text-xs">WhatsApp</span>
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-gray-500 w-24 shrink-0">Endereço:</dt>
            <dd className="font-semibold text-gray-900">{address}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-gray-500 w-24 shrink-0">Pagamento:</dt>
            <dd className="font-semibold text-gray-900">
              {PAYMENT_METHOD_LABELS[formData.paymentMethod]}
            </dd>
          </div>
          {formData.notes && (
            <div className="flex gap-2">
              <dt className="text-gray-500 w-24 shrink-0">Obs.:</dt>
              <dd className="text-gray-700 italic">{formData.notes}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Items */}
      <div className="card p-5 mb-4">
        <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide mb-3">
          Itens do Pedido
        </h3>
        <ul className="space-y-2">
          {cartItems.map((item) => (
            <li key={item.flavorId} className="flex justify-between text-sm">
              <span className="text-gray-800">{item.flavorName}</span>
              <span className="font-semibold text-gray-900">{item.quantity} un.</span>
            </li>
          ))}
        </ul>
        <div className="border-t border-gray-100 mt-4 pt-4 space-y-1">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Total de unidades</span>
            <span className="font-bold">{totalUnits}</span>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>Total a pagar</span>
            <span className="text-brand-600">{formatEUR(totalCents)}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4 text-sm">
          ⚠️ {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={submitting}
          className="btn-secondary flex-1"
        >
          ← Editar
        </button>
        <button
          onClick={onConfirm}
          disabled={submitting}
          className="btn-primary flex-1 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <span className="animate-spin">⏳</span> Enviando...
            </>
          ) : (
            '🧊 Confirmar pedido'
          )}
        </button>
      </div>
    </div>
  );
}
