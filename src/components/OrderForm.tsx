'use client';

import { useState, useEffect, useRef } from 'react';
import { FormData } from '@/app/page';
import { CartItem, PaymentMethod, PAYMENT_METHOD_LABELS } from '@/types';
import { formatEUR } from '@/lib/flavors';
import { isValidBelgianPhone } from '@/lib/phone';

interface Props {
  initialData: FormData;
  onSubmit: (data: FormData) => void;
  cartItems: CartItem[];
  totalUnits: number;
  totalCents: number;
}

declare global {
  interface Window {
    google?: {
      maps?: {
        places?: {
          Autocomplete: new (
            input: HTMLInputElement,
            options?: object
          ) => {
            addListener: (event: string, handler: () => void) => void;
            getPlace: () => {
              formatted_address?: string;
              address_components?: Array<{
                long_name: string;
                short_name: string;
                types: string[];
              }>;
            };
          };
        };
      };
    };
  }
}

export default function OrderForm({ initialData, onSubmit, cartItems, totalUnits, totalCents }: Props) {
  const [form, setForm] = useState<FormData>(initialData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const streetRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<ReturnType<NonNullable<NonNullable<Window['google']>['maps']>['places']>['Autocomplete']['prototype'] | null>(null);
  const [googleLoaded, setGoogleLoaded] = useState(false);

  // Load Google Places if key is available
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!apiKey || typeof window === 'undefined') return;
    if (window.google?.maps?.places) {
      setGoogleLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => setGoogleLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!googleLoaded || !streetRef.current || !window.google?.maps?.places) return;

    autocompleteRef.current = new window.google.maps.places.Autocomplete(streetRef.current, {
      componentRestrictions: { country: 'be' },
      types: ['address'],
    });

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      if (!place?.address_components) return;

      let street = '';
      let streetNumber = '';
      let postalCode = '';
      let city = '';

      for (const component of place.address_components) {
        if (component.types.includes('route')) street = component.long_name;
        if (component.types.includes('street_number')) streetNumber = component.long_name;
        if (component.types.includes('postal_code')) postalCode = component.long_name;
        if (component.types.includes('locality')) city = component.long_name;
      }

      setForm((prev) => ({
        ...prev,
        addressStreet: street,
        addressNumber: streetNumber,
        addressPostalCode: postalCode,
        addressCity: city,
      }));
    });
  }, [googleLoaded]);

  const set = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!form.customerName.trim() || form.customerName.trim().length < 2) {
      newErrors.customerName = 'Nome completo obrigatório (mín. 2 caracteres)';
    }
    if (!isValidBelgianPhone(form.customerPhone)) {
      newErrors.customerPhone = 'Número de telefone belga inválido (ex: +32 470 12 34 56)';
    }
    if (!form.addressStreet.trim()) {
      newErrors.addressStreet = 'Rua obrigatória';
    }
    if (!form.addressNumber.trim()) {
      newErrors.addressNumber = 'Número obrigatório';
    }
    if (!/^\d{4}$/.test(form.addressPostalCode.trim())) {
      newErrors.addressPostalCode = 'Código postal belga deve ter 4 dígitos';
    }
    if (!form.addressCity.trim()) {
      newErrors.addressCity = 'Cidade obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onSubmit(form);
  };

  const errorClass = (field: keyof FormData) =>
    errors[field] ? 'border-red-400 focus:ring-red-400' : '';

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">📋 Seus Dados</h2>

      <form onSubmit={handleSubmit} noValidate>
        {/* Personal info */}
        <div className="card p-5 mb-5">
          <h3 className="font-bold text-gray-800 mb-4 text-lg">👤 Informações Pessoais</h3>
          <div className="space-y-4">
            <div>
              <label className="label">Nome completo *</label>
              <input
                className={`input-field ${errorClass('customerName')}`}
                placeholder="Ex: Maria Silva"
                value={form.customerName}
                onChange={(e) => set('customerName', e.target.value)}
              />
              {errors.customerName && <p className="text-red-500 text-xs mt-1">{errors.customerName}</p>}
            </div>

            <div>
              <label className="label">
                Telefone (Bélgica) *{' '}
                <span className="text-brand-600 font-normal text-xs">📱 WhatsApp</span>
              </label>
              <input
                className={`input-field ${errorClass('customerPhone')}`}
                placeholder="Ex: +32 470 12 34 56 ou 0470 12 34 56"
                value={form.customerPhone}
                onChange={(e) => set('customerPhone', e.target.value)}
                type="tel"
              />
              {errors.customerPhone && <p className="text-red-500 text-xs mt-1">{errors.customerPhone}</p>}
              <p className="text-xs text-gray-400 mt-1">Formatos aceitos: +32..., 0032..., 04XX...</p>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="card p-5 mb-5">
          <h3 className="font-bold text-gray-800 mb-4 text-lg">📍 Endereço de Entrega</h3>
          <div className="space-y-4">
            <div>
              <label className="label">Rua *{googleLoaded && <span className="text-xs font-normal text-green-600 ml-2">✓ Autocomplete ativo</span>}</label>
              <input
                ref={streetRef}
                className={`input-field ${errorClass('addressStreet')}`}
                placeholder="Ex: Rue de la Loi"
                value={form.addressStreet}
                onChange={(e) => set('addressStreet', e.target.value)}
              />
              {errors.addressStreet && <p className="text-red-500 text-xs mt-1">{errors.addressStreet}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Número *</label>
                <input
                  className={`input-field ${errorClass('addressNumber')}`}
                  placeholder="Ex: 16"
                  value={form.addressNumber}
                  onChange={(e) => set('addressNumber', e.target.value)}
                />
                {errors.addressNumber && <p className="text-red-500 text-xs mt-1">{errors.addressNumber}</p>}
              </div>
              <div>
                <label className="label">Apto / Complemento</label>
                <input
                  className="input-field"
                  placeholder="Ex: Apt 3B"
                  value={form.addressUnit}
                  onChange={(e) => set('addressUnit', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Código Postal *</label>
                <input
                  className={`input-field ${errorClass('addressPostalCode')}`}
                  placeholder="Ex: 1000"
                  value={form.addressPostalCode}
                  onChange={(e) => set('addressPostalCode', e.target.value.replace(/\D/g, ''))}
                  maxLength={4}
                  inputMode="numeric"
                />
                {errors.addressPostalCode && <p className="text-red-500 text-xs mt-1">{errors.addressPostalCode}</p>}
              </div>
              <div>
                <label className="label">Cidade *</label>
                <input
                  className={`input-field ${errorClass('addressCity')}`}
                  placeholder="Ex: Bruxelles"
                  value={form.addressCity}
                  onChange={(e) => set('addressCity', e.target.value)}
                />
                {errors.addressCity && <p className="text-red-500 text-xs mt-1">{errors.addressCity}</p>}
              </div>
            </div>

            <div>
              <label className="label">País</label>
              <input
                className="input-field bg-gray-50 text-gray-500 cursor-not-allowed"
                value="🇧🇪 Bélgica"
                readOnly
              />
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="card p-5 mb-5">
          <h3 className="font-bold text-gray-800 mb-4 text-lg">💳 Forma de Pagamento</h3>
          <div className="space-y-3">
            {(['dinheiro', 'cartao', 'transferencia'] as PaymentMethod[]).map((method) => (
              <label
                key={method}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  form.paymentMethod === method
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method}
                  checked={form.paymentMethod === method}
                  onChange={() => set('paymentMethod', method)}
                  className="accent-brand-600"
                />
                <span className="font-medium text-gray-800">
                  {method === 'dinheiro' && '💵 '}
                  {method === 'cartao' && '💳 '}
                  {method === 'transferencia' && '🏦 '}
                  {PAYMENT_METHOD_LABELS[method]}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="card p-5 mb-5">
          <h3 className="font-bold text-gray-800 mb-4 text-lg">📝 Observações</h3>
          <textarea
            className="input-field resize-none"
            rows={3}
            placeholder="Instruções de entrega, referências, etc. (opcional)"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </div>

        {/* Order summary mini */}
        <div className="card p-4 mb-6 bg-brand-50 border-brand-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-brand-700 font-medium">{totalUnits} geladinhos</p>
              <p className="text-xs text-brand-600">
                {cartItems.length} sabore{cartItems.length !== 1 ? 's' : ''}
              </p>
            </div>
            <p className="text-xl font-bold text-brand-700">{formatEUR(totalCents)}</p>
          </div>
        </div>

        <button type="submit" className="btn-primary w-full text-lg py-4">
          Revisar pedido →
        </button>
      </form>
    </div>
  );
}
