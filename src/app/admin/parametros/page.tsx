'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ExpenseCategory, OrderStatusConfig } from '@/types';

const ICON_OPTIONS = ['🛒', '⛽', '👷', '📦', '📋', '🏠', '💡', '🚗', '🍳', '🧊', '🧹', '💰', '📱', '🔧', '🎨'];
const COLOR_OPTIONS = ['#E05A20', '#0369A1', '#7C3AED', '#059669', '#6B7280', '#DC2626', '#D97706', '#EC4899', '#2563EB', '#0891B2'];

type TabKey = 'expense-categories' | 'order-statuses';

export default function ParametrosPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('expense-categories');
  const [loading, setLoading] = useState(true);

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6B7280');
  const [newIcon, setNewIcon] = useState('📦');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryColor, setEditCategoryColor] = useState('');
  const [editCategoryIcon, setEditCategoryIcon] = useState('');

  const [statusConfigs, setStatusConfigs] = useState<OrderStatusConfig[]>([]);
  const [editingStatusKey, setEditingStatusKey] = useState<string | null>(null);
  const [editStatusLabel, setEditStatusLabel] = useState('');
  const [editStatusColor, setEditStatusColor] = useState('');
  const [editStatusSortOrder, setEditStatusSortOrder] = useState(0);

  const [error, setError] = useState('');

  const fetchData = async () => {
    const [categoriesResponse, statusesResponse] = await Promise.all([
      fetch('/api/admin/expense-categories'),
      fetch('/api/admin/order-statuses'),
    ]);

    if (categoriesResponse.status === 401 || statusesResponse.status === 401) {
      router.push('/admin/login');
      return;
    }

    setCategories(await categoriesResponse.json());
    setStatusConfigs(await statusesResponse.json());
    setLoading(false);
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handleAddCategory = async () => {
    if (!newName.trim()) {
      setError('Nome é obrigatório');
      return;
    }

    const response = await fetch('/api/admin/expense-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), color: newColor, icon: newIcon }),
    });

    if (response.ok) {
      setNewName('');
      setNewColor('#6B7280');
      setNewIcon('📦');
      setError('');
      void fetchData();
      return;
    }

    const data = await response.json();
    setError(data.error || 'Erro ao criar categoria');
  };

  const startEditCategory = (category: ExpenseCategory) => {
    setEditingCategoryId(category.id);
    setEditCategoryName(category.name);
    setEditCategoryColor(category.color);
    setEditCategoryIcon(category.icon);
  };

  const handleUpdateCategory = async (id: string) => {
    const response = await fetch(`/api/admin/expense-categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editCategoryName.trim(),
        color: editCategoryColor,
        icon: editCategoryIcon,
      }),
    });

    if (response.ok) {
      setEditingCategoryId(null);
      setError('');
      void fetchData();
      return;
    }

    const data = await response.json();
    setError(data.error || 'Erro ao atualizar categoria');
  };

  const handleToggleCategory = async (category: ExpenseCategory) => {
    await fetch(`/api/admin/expense-categories/${category.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !category.active }),
    });
    void fetchData();
  };

  const handleDeleteCategory = async (category: ExpenseCategory) => {
    if (!confirm(`Excluir a categoria "${category.name}"?`)) return;

    const response = await fetch(`/api/admin/expense-categories/${category.id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      void fetchData();
      return;
    }

    const data = await response.json();
    alert(data.error || 'Erro ao excluir');
  };

  const startEditStatus = (config: OrderStatusConfig) => {
    setEditingStatusKey(config.key);
    setEditStatusLabel(config.label);
    setEditStatusColor(config.color);
    setEditStatusSortOrder(config.sort_order);
  };

  const handleUpdateStatus = async (key: string) => {
    const response = await fetch(`/api/admin/order-statuses/${key}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: editStatusLabel.trim(),
        color: editStatusColor,
        sort_order: editStatusSortOrder,
      }),
    });

    if (response.ok) {
      setEditingStatusKey(null);
      setError('');
      void fetchData();
      return;
    }

    const data = await response.json();
    setError(data.error || 'Erro ao atualizar status');
  };

  const handleToggleStatus = async (config: OrderStatusConfig) => {
    await fetch(`/api/admin/order-statuses/${config.key}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !config.active }),
    });
    void fetchData();
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">⏳ Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="font-medium text-gray-500 hover:text-gray-700">← Admin</Link>
          <span className="text-gray-300">|</span>
          <h1 className="font-bold text-gray-900">⚙️ Parâmetros</h1>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setTab('expense-categories')}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
              tab === 'expense-categories'
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            🏷️ Tipos de Gasto
          </button>
          <button
            type="button"
            onClick={() => setTab('order-statuses')}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
              tab === 'order-statuses'
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            📮 Status de Pedido
          </button>
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">⚠️ {error}</div>}

        {tab === 'expense-categories' && (
          <>
            <div className="card p-6">
              <h2 className="mb-4 text-lg font-bold text-gray-900">➕ Novo Tipo de Gasto</h2>
              <div className="space-y-4">
                <div>
                  <label className="label">Nome</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ex: Matéria-prima"
                    value={newName}
                    onChange={(event) => {
                      setNewName(event.target.value);
                      setError('');
                    }}
                  />
                </div>

                <div>
                  <label className="label">Ícone</label>
                  <div className="flex flex-wrap gap-2">
                    {ICON_OPTIONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setNewIcon(icon)}
                        className={`rounded-xl border-2 p-2 text-2xl transition-all ${
                          newIcon === icon ? 'border-brand-500 bg-brand-50 scale-110' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label">Cor</label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewColor(color)}
                        className={`h-8 w-8 rounded-full border-2 transition-all ${
                          newColor === color ? 'scale-110 border-gray-800 ring-2 ring-offset-2' : 'border-gray-200'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <button type="button" onClick={handleAddCategory} className="btn-primary py-2.5 px-6">
                  Cadastrar
                </button>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="mb-4 text-lg font-bold text-gray-900">Tipos de Gasto ({categories.length})</h2>
              <div className="space-y-2">
                {categories.map((category) => (
                  <div key={category.id}>
                    {editingCategoryId === category.id ? (
                      <div className="space-y-3 rounded-xl border-2 border-brand-400 bg-brand-50 p-4">
                        <input
                          type="text"
                          value={editCategoryName}
                          onChange={(event) => setEditCategoryName(event.target.value)}
                          className="input-field py-2 text-sm font-bold"
                        />
                        <div className="flex flex-wrap gap-2">
                          {ICON_OPTIONS.map((icon) => (
                            <button
                              key={icon}
                              type="button"
                              onClick={() => setEditCategoryIcon(icon)}
                              className={`rounded-lg border-2 p-1.5 text-xl ${
                                editCategoryIcon === icon ? 'border-brand-500 bg-white' : 'border-transparent'
                              }`}
                            >
                              {icon}
                            </button>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {COLOR_OPTIONS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setEditCategoryColor(color)}
                              className={`h-6 w-6 rounded-full border-2 ${
                                editCategoryColor === color ? 'scale-110 border-gray-800' : 'border-gray-200'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => void handleUpdateCategory(category.id)} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700">Salvar</button>
                          <button type="button" onClick={() => setEditingCategoryId(null)} className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-300">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${category.active ? 'border-gray-200 bg-white' : 'border-dashed border-gray-200 bg-gray-50'}`}>
                        <input type="checkbox" checked={category.active} onChange={() => void handleToggleCategory(category)} className="h-4 w-4 cursor-pointer accent-brand-600" />
                        <span className="text-xl">{category.icon}</span>
                        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
                        <span className={`flex-1 text-sm font-semibold ${category.active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{category.name}</span>
                        <button type="button" onClick={() => startEditCategory(category)} className="rounded-lg bg-blue-50 px-2 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100">✏️</button>
                        <button type="button" onClick={() => void handleDeleteCategory(category)} className="rounded-lg bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-100">🗑️</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'order-statuses' && (
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Status de Pedido</h2>
            <div className="space-y-2">
              {statusConfigs.map((config) => (
                <div key={config.key}>
                  {editingStatusKey === config.key ? (
                    <div className="space-y-3 rounded-xl border-2 border-brand-400 bg-brand-50 p-4">
                      <div>
                        <label className="label">Rótulo</label>
                        <input
                          type="text"
                          value={editStatusLabel}
                          onChange={(event) => setEditStatusLabel(event.target.value)}
                          className="input-field py-2 text-sm font-bold"
                        />
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="label">Cor</label>
                          <input type="color" value={editStatusColor} onChange={(event) => setEditStatusColor(event.target.value)} className="h-11 w-full rounded-xl border border-gray-200 bg-white p-1" />
                        </div>
                        <div>
                          <label className="label">Ordem</label>
                          <input type="number" value={editStatusSortOrder} onChange={(event) => setEditStatusSortOrder(Number(event.target.value) || 0)} className="input-field" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => void handleUpdateStatus(config.key)} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700">Salvar</button>
                        <button type="button" onClick={() => setEditingStatusKey(null)} className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-300">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${config.active ? 'border-gray-200 bg-white' : 'border-dashed border-gray-200 bg-gray-50'}`}>
                      <input type="checkbox" checked={config.active} onChange={() => void handleToggleStatus(config)} className="h-4 w-4 cursor-pointer accent-brand-600" />
                      <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: `${config.color}20`, color: config.color }}>
                        {config.label}
                      </span>
                      <span className="text-xs text-gray-400">chave: {config.key}</span>
                      <span className="ml-auto text-xs text-gray-500">ordem {config.sort_order}</span>
                      <button type="button" onClick={() => startEditStatus(config)} className="rounded-lg bg-blue-50 px-2 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100">✏️</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
