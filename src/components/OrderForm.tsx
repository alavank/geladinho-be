'use client';

import { useState } from 'react';
import { FormData } from '@/app/page';
import { CartItem } from '@/types';
import { formatEUR } from '@/lib/flavors';
import { isValidBelgianPhone } from '@/lib/phone';
import AddressAutocomplete from './AddressAutocomplete';

interface ActiveFlavor { id: string; name: string; priceEurCents: number; index: number }

interface Props {
  initialData: FormData;
  onSubmit: (data: FormData) => void;
  cartItems: CartItem[];
  activeFlavors: ActiveFlavor[];
  totalUnits: number;
  subtotalCents: number;
  freightCents: number;
  grandTotalCents: number;
}

export default function OrderForm({ initialData, onSubmit, cartItems, activeFlavors, totalUnits, subtotalCents, freightCents, grandTotalCents }: Props) {
  const [form, setForm] = useState<FormData>(initialData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const set = (field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.customerName.trim() || form.customerName.trim().length < 2) e.customerName = 'Nome completo obrigatório';
    if (!isValidBelgianPhone(form.customerPhone)) e.customerPhone = 'Número belga inválido (ex: +32 470 12 34 56)';
    if (!form.addressStreet.trim()) e.addressStreet = 'Rua obrigatória';
    if (!form.addressNumber.trim()) e.addressNumber = 'Número obrigatório';
    if (!/^\d{4}$/.test(form.addressPostalCode.trim())) e.addressPostalCode = 'Código postal deve ter 4 dígitos';
    if (!form.addressCommune.trim()) e.addressCommune = 'Comuna obrigatória';
    if (form.needsChange && !form.changeAmount.trim()) e.changeAmount = 'Informe o valor que você tem em mãos';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const err = (field: keyof FormData) => errors[field] ? 'border-red-400 focus:ring-red-400' : '';

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">📋 Seus Dados</h2>
      <form onSubmit={(e) => { e.preventDefault(); if (validate()) onSubmit(form); }} noValidate>
        <div className="card p-5 mb-5">
          <h3 className="font-bold text-gray-800 mb-4 text-lg">👤 Informações Pessoais</h3>
          <div className="space-y-4">
            <div>
              <label className="label">Nome completo *</label>
              <input className={`input-field ${err('customerName')}`} placeholder="Ex: Maria Silva" value={form.customerName} onChange={(e) => set('customerName', e.target.value)} />
              {errors.customerName && <p className="text-red-500 text-xs mt-1">{errors.customerName}</p>}
            </div>
            <div>
              <label className="label">Telefone (Bélgica) * <span className="text-brand-600 font-normal text-xs">📱 WhatsApp</span></label>
              <input className={`input-field ${err('customerPhone')}`} placeholder="+32 470 12 34 56" value={form.customerPhone} onChange={(e) => set('customerPhone', e.target.value)} type="tel" />
              {errors.customerPhone && <p className="text-red-500 text-xs mt-1">{errors.customerPhone}</p>}
              <p className="text-xs text-gray-400 mt-1">Formatos aceitos: +32..., 0032..., 04XX...</p>
            </div>
          </div>
        </div>

        <div className="card p-5 mb-5">
          <h3 className="font-bold text-gray-800 mb-4 text-lg">📍 Endereço de Entrega</h3>
          <div className="space-y-4">
            <div>
              <label className="label">Rue, Avenue, Chaussée... *</label>
              <AddressAutocomplete
                className={`input-field ${err('addressStreet')}`}
                placeholder="Ex: Rue de la Loi"
                value={form.addressStreet}
                onChange={(v) => set('addressStreet', v)}
                onAddressSelected={(addr) => {
                  setForm((prev) => ({
                    ...prev,
                    addressStreet: addr.street,
                    addressNumber: addr.number || prev.addressNumber,
                    addressPostalCode: addr.postalCode || prev.addressPostalCode,
                    addressCommune: addr.city || prev.addressCommune,
                  }));
                  setErrors({});
                }}
              />
              {errors.addressStreet && <p className="text-red-500 text-xs mt-1">{errors.addressStreet}</p>}
            </div>
            <div>
              <label className="label">Número *</label>
              <input className={`input-field ${err('addressNumber')}`} placeholder="Ex: 16" value={form.addressNumber} onChange={(e) => set('addressNumber', e.target.value)} />
              {errors.addressNumber && <p className="text-red-500 text-xs mt-1">{errors.addressNumber}</p>}
            </div>
            <div>
              <label className="label">Código Postal *</label>
              <input className={`input-field ${err('addressPostalCode')}`} placeholder="Ex: 1000" value={form.addressPostalCode} onChange={(e) => set('addressPostalCode', e.target.value.replace(/\D/g, ''))} maxLength={4} inputMode="numeric" />
              {errors.addressPostalCode && <p className="text-red-500 text-xs mt-1">{errors.addressPostalCode}</p>}
            </div>
            <div>
              <label className="label">Comuna *</label>
              <input className={`input-field ${err('addressCommune')}`} placeholder="Ex: Bruxelles, Liège, Anderlecht..." value={form.addressCommune} onChange={(e) => set('addressCommune', e.target.value)} />
              {errors.addressCommune && <p className="text-red-500 text-xs mt-1">{errors.addressCommune}</p>}
            </div>
          </div>
        </div>

        <div className="card p-5 mb-5">
          <h3 className="font-bold text-gray-800 mb-4 text-lg">💶 Pagamento</h3>
          <p className="text-gray-600 text-sm mb-4">Precisa de troco?</p>
          <div className="flex gap-3 mb-4">
            {[{ value: false, label: 'Não', icon: '✅' }, { value: true, label: 'Sim', icon: '💵' }].map((opt) => (
              <label key={String(opt.value)} className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${form.needsChange === opt.value ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" name="needsChange" checked={form.needsChange === opt.value} onChange={() => set('needsChange', opt.value)} className="accent-brand-600" />
                <span className="font-semibold text-gray-800">{opt.icon} {opt.label}</span>
              </label>
            ))}
          </div>
          {form.needsChange && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="font-bold text-amber-900 mb-1">Troco pra quanto?</p>
              <label className="label text-amber-800 font-normal text-sm">Qual valor você tem em mãos? (€) *</label>
              <input className={`input-field mt-1 ${err('changeAmount')}`} placeholder="Ex: 50 ou 100" value={form.changeAmount} onChange={(e) => set('changeAmount', e.target.value)} inputMode="decimal" />
              {errors.changeAmount && <p className="text-red-500 text-xs mt-1">{errors.changeAmount}</p>}
              <p className="text-xs text-amber-600 mt-2">O entregador levará o troco necessário 💰</p>
            </div>
          )}
        </div>

        <div className="card p-5 mb-5">
          <h3 className="font-bold text-gray-800 mb-3 text-lg">📝 Observações</h3>
          <textarea className="input-field resize-none" rows={3} placeholder="Instruções de entrega, referências, etc. (opcional)" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>

        <div className="card p-4 mb-6 bg-brand-50 border border-brand-200">
          <div className="space-y-1">
            <div className="flex justify-between text-sm text-brand-700">
              <span>{totalUnits} geladinhos · {cartItems.length} sabore{cartItems.length !== 1 ? 's' : ''}</span>
              <span>{formatEUR(subtotalCents)}</span>
            </div>
            {freightCents > 0 && (
              <div className="flex justify-between text-sm text-brand-700">
                <span>Frete</span><span>{formatEUR(freightCents)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg text-brand-700 border-t border-brand-200 pt-1">
              <span>Total</span><span>{formatEUR(grandTotalCents)}</span>
            </div>
          </div>
        </div>

        <button type="submit" className="btn-primary w-full text-lg py-4">Revisar pedido →</button>
      </form>
    </div>
  );
}
