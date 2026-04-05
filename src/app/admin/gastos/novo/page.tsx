'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ExpenseCategory, Supplier } from '@/types';

function toDisplay(cents: number): string { return (cents / 100).toFixed(2).replace('.', ','); }
function toCents(val: string): number {
  const n = parseFloat(val.replace(',', '.').replace(/[^\d.]/g, ''));
  return isNaN(n) ? 0 : Math.round(n * 100);
}

export default function NovoGastoPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [scanSuccess, setScanSuccess] = useState(false);

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    category_id: '',
    supplier_id: '',
    description: '',
    amount_display: '',
    amount_cents: 0,
    notes: '',
    receipt_image_url: '',
    ocr_raw_data: null as Record<string, unknown> | null,
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/expense-categories').then((r) => { if (r.status === 401) { router.push('/admin/login'); throw new Error('unauth'); } return r.json(); }),
      fetch('/api/admin/suppliers').then((r) => r.json()),
    ]).then(([cats, supps]) => {
      setCategories(cats.filter((c: ExpenseCategory) => c.active));
      setSuppliers(supps.filter((s: Supplier) => s.active));
      setLoading(false);
    }).catch((e) => { if (e.message !== 'unauth') setLoading(false); });
  }, []);

  const handleScan = async (file: File) => {
    setScanning(true);
    setError('');
    setScanSuccess(false);

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setScanPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('receipt', file);

    try {
      const res = await fetch('/api/admin/expenses/scan', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao processar imagem');
        setScanning(false);
        return;
      }

      // Auto-fill form with OCR results
      setForm((prev) => ({
        ...prev,
        amount_cents: data.total_amount_cents || prev.amount_cents,
        amount_display: data.total_amount_cents ? toDisplay(data.total_amount_cents) : prev.amount_display,
        date: data.date || prev.date,
        description: data.supplier_name
          ? `Compra em ${data.supplier_name}`
          : prev.description,
        ocr_raw_data: data.ocr_raw_data || null,
      }));

      // Try to match supplier by name
      if (data.supplier_name) {
        const match = suppliers.find((s) =>
          s.name.toLowerCase().includes(data.supplier_name.toLowerCase()) ||
          data.supplier_name.toLowerCase().includes(s.name.toLowerCase())
        );
        if (match) {
          setForm((prev) => ({ ...prev, supplier_id: match.id }));
        }
      }

      setScanSuccess(true);
    } catch {
      setError('Erro de conexão ao processar imagem');
    }

    setScanning(false);
  };

  const handleSubmit = async () => {
    if (!form.category_id) { setError('Selecione uma categoria'); return; }
    if (!form.description.trim()) { setError('Descrição é obrigatória'); return; }
    if (form.amount_cents <= 0) { setError('Valor deve ser maior que zero'); return; }

    setSaving(true);
    setError('');

    const res = await fetch('/api/admin/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: form.date,
        category_id: form.category_id,
        supplier_id: form.supplier_id || null,
        description: form.description.trim(),
        amount_eur_cents: form.amount_cents,
        receipt_image_url: form.receipt_image_url || null,
        ocr_raw_data: form.ocr_raw_data,
        notes: form.notes.trim() || null,
      }),
    });

    if (res.ok) {
      router.push('/admin/gastos');
    } else {
      const data = await res.json();
      setError(data.error || 'Erro ao salvar');
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">⏳ Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/admin/gastos" className="text-gray-500 hover:text-gray-700 font-medium">← Gastos</Link>
          <span className="text-gray-300">|</span>
          <h1 className="font-bold text-gray-900">💸 Novo Gasto</h1>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">

        {/* Scan receipt */}
        <div className="card p-6">
          <h2 className="font-bold text-gray-900 text-lg mb-2">📸 Escanear Nota Fiscal</h2>
          <p className="text-sm text-gray-500 mb-4">Tire uma foto ou selecione uma imagem da nota. Os dados serão pré-preenchidos automaticamente.</p>

          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleScan(f); }} />

          <div className="flex gap-3">
            <button onClick={() => fileInputRef.current?.click()} disabled={scanning}
              className="flex-1 btn-primary py-3 text-base disabled:opacity-60">
              {scanning ? '⏳ Processando...' : '📷 Tirar Foto / Selecionar'}
            </button>
          </div>

          {scanning && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
              <div className="animate-pulse text-blue-600 font-semibold">Analisando nota fiscal com IA...</div>
              <p className="text-xs text-blue-500 mt-1">Isso pode levar alguns segundos</p>
            </div>
          )}

          {scanSuccess && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-green-700 font-semibold">✅ Nota analisada com sucesso!</p>
              <p className="text-xs text-green-600 mt-1">Confira os dados abaixo e ajuste se necessário.</p>
            </div>
          )}

          {scanPreview && (
            <div className="mt-4">
              <img src={scanPreview} alt="Preview da nota" className="max-h-48 rounded-xl border border-gray-200 mx-auto" />
            </div>
          )}
        </div>

        {/* Form */}
        <div className="card p-6 space-y-4">
          <h2 className="font-bold text-gray-900 text-lg mb-2">Dados do Gasto</h2>

          <div>
            <label className="label">Data *</label>
            <input type="date" className="input-field" value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>

          <div>
            <label className="label">Categoria *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map((cat) => (
                <button key={cat.id} onClick={() => setForm({ ...form, category_id: cat.id })}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all text-sm font-semibold ${
                    form.category_id === cat.id
                      ? 'border-current shadow-sm'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={form.category_id === cat.id ? { color: cat.color, borderColor: cat.color, backgroundColor: cat.color + '10' } : {}}>
                  <span className="text-xl">{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Valor (EUR) *</label>
            <div className="flex items-stretch border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-brand-400 bg-white">
              <span className="flex items-center px-4 bg-gray-100 border-r border-gray-300 text-gray-600 text-lg font-bold select-none">€</span>
              <input type="text" inputMode="decimal" placeholder="0,00"
                value={form.amount_display}
                onChange={(e) => setForm({ ...form, amount_display: e.target.value })}
                onBlur={() => {
                  const cents = toCents(form.amount_display);
                  setForm({ ...form, amount_cents: cents, amount_display: cents > 0 ? toDisplay(cents) : '' });
                }}
                className="flex-1 min-w-0 px-4 py-3 text-lg font-bold text-gray-900 bg-white focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="label">Descrição *</label>
            <input type="text" className="input-field" placeholder="Ex: Compra de ingredientes no Carrefour"
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div>
            <label className="label">Fornecedor</label>
            <select className="input-field" value={form.supplier_id}
              onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
              <option value="">— Nenhum —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Observações</label>
            <textarea className="input-field" rows={2} placeholder="Detalhes adicionais..."
              value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          {/* OCR items preview */}
          {form.ocr_raw_data && Array.isArray((form.ocr_raw_data as { items?: unknown }).items) && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Itens detectados na nota</p>
              <div className="space-y-1">
                {((form.ocr_raw_data as { items: Array<{ name: string; quantity?: number; price?: number }> }).items).map((item: { name: string; quantity?: number; price?: number }, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-700">{item.quantity && item.quantity > 1 ? `${item.quantity}x ` : ''}{item.name}</span>
                    {item.price != null && <span className="text-gray-500 font-mono">&euro; {item.price.toFixed(2)}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-red-500 text-sm font-semibold">⚠️ {error}</p>}

          <div className="flex gap-3 pt-2">
            <button onClick={handleSubmit} disabled={saving} className="flex-1 btn-primary py-3 text-base">
              {saving ? '⏳ Salvando...' : '💾 Salvar Gasto'}
            </button>
            <Link href="/admin/gastos" className="btn-secondary py-3 px-6 text-center">Cancelar</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
