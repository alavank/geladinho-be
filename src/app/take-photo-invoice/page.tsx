'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { formatEUR } from '@/lib/flavors';

type Status = 'idle' | 'scanning' | 'success' | 'error';

interface QuickResult {
  expense: {
    id: string;
    description: string;
    amount_eur_cents: number;
    date: string;
    items: { name: string; quantity: number; line_total_eur_cents: number }[];
  };
  ocr: {
    supplier_name: string | null;
    total_amount_cents: number;
    items_count: number;
  };
}

export default function TakePhotoInvoicePage() {
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<QuickResult | null>(null);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setStatus('scanning');
    setError('');
    setResult(null);

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('receipt', file);

    try {
      const res = await fetch('/api/admin/expenses/quick-scan', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao processar');
        setStatus('error');
        return;
      }

      setResult(data);
      setStatus('success');
    } catch {
      setError('Erro de conexão. Verifique sua internet.');
      setStatus('error');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const reset = () => {
    setStatus('idle');
    setResult(null);
    setError('');
    setPreview(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-red-100 px-4 py-3 flex items-center justify-center shadow-sm">
        <Image src="/logo.png" alt="Madame Simone" width={140} height={50} className="h-10 w-auto object-contain" />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">

        {/* IDLE STATE */}
        {status === 'idle' && (
          <div className="w-full max-w-sm space-y-4">
            <div className="text-center mb-6">
              <p className="text-5xl mb-3">🧾</p>
              <h1 className="text-xl font-bold text-gray-900">Registro Rápido de Gasto</h1>
              <p className="text-sm text-gray-500 mt-1">Tire a foto da nota e salve na hora</p>
            </div>

            {/* Camera button */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="w-full py-6 rounded-2xl bg-[#C41230] hover:bg-[#a50f28] text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
            >
              📸 TIRAR FOTO DA NOTA DE GASTO
            </button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleInputChange}
              className="hidden"
            />

            {/* Upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 rounded-2xl border-2 border-[#C41230] text-[#C41230] font-bold text-base hover:bg-red-50 transition-all active:scale-[0.98]"
            >
              🖼️ UPLOAD DA GALERIA DE FOTOS
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleInputChange}
              className="hidden"
            />

            <p className="text-center text-xs text-gray-400 mt-4">
              A IA vai ler a nota automaticamente e salvar o gasto. Depois confira os dados no painel.
            </p>
          </div>
        )}

        {/* SCANNING STATE */}
        {status === 'scanning' && (
          <div className="w-full max-w-sm text-center space-y-6">
            {preview && (
              <div className="relative mx-auto w-48 h-48 rounded-2xl overflow-hidden border-2 border-red-200 shadow-md">
                <img src={preview} alt="Nota" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              </div>
            )}
            <div>
              <p className="text-lg font-bold text-gray-900">Processando nota...</p>
              <p className="text-sm text-gray-500 mt-1">A IA está lendo os dados da imagem</p>
            </div>
            <div className="flex justify-center">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-[#C41230] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-[#C41230] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-[#C41230] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* SUCCESS STATE */}
        {status === 'success' && result && (
          <div className="w-full max-w-sm space-y-4">
            <div className="text-center">
              <p className="text-5xl mb-2">✅</p>
              <h2 className="text-xl font-bold text-green-700">Gasto Salvo!</h2>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
              {result.ocr.supplier_name && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Fornecedor</p>
                  <p className="font-bold text-gray-900">{result.ocr.supplier_name}</p>
                </div>
              )}
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Total</p>
                  <p className="text-2xl font-black text-[#C41230]">
                    {result.expense.amount_eur_cents > 0
                      ? formatEUR(result.expense.amount_eur_cents)
                      : '—'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Itens</p>
                  <p className="text-lg font-bold text-gray-700">{result.ocr.items_count}</p>
                </div>
              </div>
              {result.expense.date && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Data</p>
                  <p className="font-medium text-gray-700">{result.expense.date}</p>
                </div>
              )}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs text-amber-700">💡 Confira e ajuste os dados completos no painel de Gastos quando estiver no computador.</p>
            </div>

            <button
              onClick={reset}
              className="w-full py-5 rounded-2xl bg-[#C41230] hover:bg-[#a50f28] text-white font-bold text-lg shadow-lg transition-all active:scale-[0.98]"
            >
              📸 REGISTRAR OUTRA NOTA
            </button>
          </div>
        )}

        {/* ERROR STATE */}
        {status === 'error' && (
          <div className="w-full max-w-sm space-y-4">
            <div className="text-center">
              <p className="text-5xl mb-2">❌</p>
              <h2 className="text-xl font-bold text-red-700">Erro ao processar</h2>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>

            <button
              onClick={reset}
              className="w-full py-5 rounded-2xl bg-[#C41230] hover:bg-[#a50f28] text-white font-bold text-lg shadow-lg transition-all active:scale-[0.98]"
            >
              🔄 TENTAR NOVAMENTE
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-gray-400">
        Madame Simone — Registro Rápido de Gastos
      </footer>
    </div>
  );
}

