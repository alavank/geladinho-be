'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminHeader from '@/components/AdminHeader';
import { ExpenseCategory } from '@/types';

const ICON_OPTIONS = ['🛒', '⛽', '👷', '📦', '📋', '🏠', '💡', '🚗', '🍳', '🧊', '🧹', '💰', '📱', '🔧', '🎨'];
const COLOR_OPTIONS = ['#E05A20', '#0369A1', '#7C3AED', '#059669', '#6B7280', '#DC2626', '#D97706', '#EC4899', '#2563EB', '#0891B2'];

export default function CategoriasPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6B7280');
  const [newIcon, setNewIcon] = useState('📦');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [error, setError] = useState('');

  const fetchCategories = async () => {
    const res = await fetch('/api/gestion/expense-categories');
    if (res.status === 401) { router.push('/gestion/login'); return; }
    setCategories(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleAdd = async () => {
    if (!newName.trim()) { setError('Nome é obrigatório'); return; }
    setError('');
    const res = await fetch('/api/gestion/expense-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), color: newColor, icon: newIcon }),
    });
    if (res.ok) {
      setNewName(''); setNewColor('#6B7280'); setNewIcon('📦');
      fetchCategories();
    } else {
      const data = await res.json();
      setError(data.error || 'Erro ao criar');
    }
  };

  const handleUpdate = async (id: string) => {
    const res = await fetch(`/api/gestion/expense-categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), color: editColor, icon: editIcon }),
    });
    if (res.ok) { setEditingId(null); fetchCategories(); }
  };

  const handleToggle = async (cat: ExpenseCategory) => {
    await fetch(`/api/gestion/expense-categories/${cat.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !cat.active }),
    });
    fetchCategories();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir a categoria "${name}"?`)) return;
    const res = await fetch(`/api/gestion/expense-categories/${id}`, { method: 'DELETE' });
    if (res.ok) fetchCategories();
    else { const data = await res.json(); alert(data.error || 'Erro ao excluir'); }
  };

  const startEdit = (cat: ExpenseCategory) => {
    setEditingId(cat.id); setEditName(cat.name); setEditColor(cat.color); setEditIcon(cat.icon);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">⏳ Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader
        breadcrumbs={[
          { label: 'Pedidos', href: '/gestion' },
          { label: 'Gastos', href: '/gestion/gastos' },
          { label: 'Categorias' },
        ]}
      />

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Add new */}
        <div className="card p-6">
          <h2 className="font-bold text-gray-900 text-lg mb-4">➕ Nova Categoria</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Nome</label>
              <input type="text" className="input-field" placeholder="Ex: Matéria-prima"
                value={newName} onChange={(e) => { setNewName(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
            </div>
            <div>
              <label className="label">Ícone</label>
              <div className="flex gap-2 flex-wrap">
                {ICON_OPTIONS.map((icon) => (
                  <button key={icon} onClick={() => setNewIcon(icon)}
                    className={`text-2xl p-2 rounded-xl border-2 transition-all ${newIcon === icon ? 'border-brand-500 bg-brand-50 scale-110' : 'border-gray-200 hover:border-gray-300'}`}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Cor</label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_OPTIONS.map((color) => (
                  <button key={color} onClick={() => setNewColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${newColor === color ? 'border-gray-800 scale-110 ring-2 ring-offset-2' : 'border-gray-200'}`}
                    style={{ backgroundColor: color }} />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-gray-50">
                <span className="text-xl">{newIcon}</span>
                <span className="font-semibold text-gray-700">{newName || 'Preview'}</span>
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: newColor }} />
              </div>
              <button onClick={handleAdd} className="btn-primary py-2.5 px-6">Cadastrar</button>
            </div>
            {error && <p className="text-red-500 text-sm">⚠️ {error}</p>}
          </div>
        </div>

        {/* List */}
        <div className="card p-6">
          <h2 className="font-bold text-gray-900 text-lg mb-4">Categorias Cadastradas ({categories.length})</h2>
          {categories.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Nenhuma categoria cadastrada.</p>
          ) : (
            <div className="space-y-2">
              {categories.map((cat) => (
                <div key={cat.id}>
                  {editingId === cat.id ? (
                    <div className="p-4 rounded-xl border-2 border-brand-400 bg-brand-50 space-y-3">
                      <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                        className="input-field py-2 text-sm font-bold" autoFocus />
                      <div className="flex gap-2 flex-wrap">
                        {ICON_OPTIONS.map((icon) => (
                          <button key={icon} onClick={() => setEditIcon(icon)}
                            className={`text-xl p-1.5 rounded-lg border-2 ${editIcon === icon ? 'border-brand-500 bg-white' : 'border-transparent'}`}>
                            {icon}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {COLOR_OPTIONS.map((color) => (
                          <button key={color} onClick={() => setEditColor(color)}
                            className={`w-6 h-6 rounded-full border-2 ${editColor === color ? 'border-gray-800 scale-110' : 'border-gray-200'}`}
                            style={{ backgroundColor: color }} />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleUpdate(cat.id)} className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold px-4 py-2 rounded-lg">Salvar</button>
                        <button onClick={() => setEditingId(null)} className="bg-gray-200 hover:bg-gray-300 text-gray-600 text-sm font-bold px-4 py-2 rounded-lg">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${cat.active ? 'border-gray-200 bg-white' : 'border-dashed border-gray-200 bg-gray-50'}`}>
                      <input type="checkbox" checked={cat.active} onChange={() => handleToggle(cat)} className="accent-brand-600 w-4 h-4 cursor-pointer" />
                      <span className="text-xl">{cat.icon}</span>
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className={`flex-1 font-semibold text-sm ${cat.active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{cat.name}</span>
                      <button onClick={() => startEdit(cat)} className="bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold px-2 py-1.5 rounded-lg">✏️</button>
                      <button onClick={() => handleDelete(cat.id, cat.name)} className="bg-red-50 hover:bg-red-100 text-red-500 text-xs font-semibold px-2 py-1.5 rounded-lg">🗑️</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
