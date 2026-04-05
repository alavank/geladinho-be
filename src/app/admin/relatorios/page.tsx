'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Order, Expense } from '@/types';
import { formatEUR } from '@/lib/flavors';

interface OrderWithItems extends Omit<Order, 'order_items'> {
  order_items?: Array<{
    id: string;
    order_id: string;
    flavor_name: string;
    quantity: number;
    unit_price_eur_cents: number;
    line_total_eur_cents: number;
  }>;
}

const B2C_COLOR = '#C41230';
const B2B_COLOR = '#0369A1';
const GOLD_COLOR = '#9B7A2E';
const COLORS = [B2C_COLOR, B2B_COLOR, GOLD_COLOR, '#E05A20', '#D4426A', '#8B2252', '#B87333', '#7A5E1E'];

type Period = '7d' | '30d' | '90d' | '12m' | 'all';
type ChannelView = 'all' | 'b2c' | 'b2b';

const PERIODS: { key: Period; label: string }[] = [
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: '90d', label: '90 dias' },
  { key: '12m', label: '12 meses' },
  { key: 'all', label: 'Tudo' },
];

function toEUR(cents: number) { return (cents / 100).toFixed(2).replace('.', ','); }
function monthLabel(d: string) { return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit', timeZone: 'Europe/Brussels' }).format(new Date(d)); }
function getMonthKey(d: string) { const dt = new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`; }
function getWeekday(d: string) { return new Date(d).getDay(); }
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function filterByPeriod(orders: OrderWithItems[], period: Period) {
  if (period === 'all') return orders;
  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
  const cutoff = new Date(Date.now() - days * 86400000);
  return orders.filter((o) => new Date(o.created_at) >= cutoff);
}

function StatCard({ label, value, sub, color = B2C_COLOR }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-black" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function CustomTooltip({ active, payload, label, isCurrency = false }: { active?: boolean; payload?: Array<{ value: number; name?: string; color?: string }>; label?: string; isCurrency?: boolean }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-bold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || COLORS[i] }} className="font-semibold">
          {p.name && <span className="text-gray-500 font-normal">{p.name}: </span>}
          {isCurrency ? `€ ${toEUR(p.value)}` : p.value}
        </p>
      ))}
    </div>
  );
}

export default function RelatoriosPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('30d');
  const [channelView, setChannelView] = useState<ChannelView>('all');

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/orders')
        .then((r) => { if (r.status === 401) { router.push('/admin/login'); throw new Error('unauth'); } return r.json(); })
        .then(async (orderList: Order[]) => {
          return Promise.all(
            orderList.map(async (o) => {
              try { const r = await fetch(`/api/admin/orders/${o.id}`); return await r.json(); } catch { return o; }
            })
          );
        }),
      fetch('/api/admin/expenses').then((r) => r.ok ? r.json() : []),
    ]).then(([withItems, expenseList]) => {
      setOrders(withItems);
      setExpenses(expenseList);
      setLoading(false);
    }).catch((e) => { if (e.message !== 'unauth') setLoading(false); });
  }, []);

  const periodFiltered = useMemo(() => filterByPeriod(orders, period), [orders, period]);
  const filtered = useMemo(() => {
    if (channelView === 'all') return periodFiltered;
    return periodFiltered.filter((o) => o.channel === channelView);
  }, [periodFiltered, channelView]);

  const b2cOrders = useMemo(() => periodFiltered.filter((o) => o.channel === 'b2c'), [periodFiltered]);
  const b2bOrders = useMemo(() => periodFiltered.filter((o) => o.channel === 'b2b'), [periodFiltered]);

  const revenue = (arr: OrderWithItems[]) => arr.reduce((s, o) => s + o.total_price_eur_cents + (o.freight_eur_cents || 0), 0);
  const units = (arr: OrderWithItems[]) => arr.reduce((s, o) => s + o.total_units, 0);
  const avgTicket = (arr: OrderWithItems[]) => arr.length > 0 ? Math.round(revenue(arr) / arr.length) : 0;

  const totalRevenue = revenue(filtered);
  const totalOrders = filtered.length;
  const totalUnits = units(filtered);
  const totalAvgTicket = avgTicket(filtered);

  // Expenses filtered by period
  const filteredExpenses = useMemo(() => {
    if (period === 'all') return expenses;
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    const cutoff = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
    return expenses.filter((e) => e.date >= cutoff);
  }, [expenses, period]);

  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount_eur_cents, 0);
  const totalProfit = totalRevenue - totalExpenses;

  // Expenses by category
  const expensesByCategory = useMemo(() => {
    const map: Record<string, { name: string; icon: string; color: string; total: number }> = {};
    filteredExpenses.forEach((e) => {
      if (!e.category) return;
      if (!map[e.category_id]) map[e.category_id] = { name: e.category.name, icon: e.category.icon, color: e.category.color, total: 0 };
      map[e.category_id].total += e.amount_eur_cents;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredExpenses]);

  // Month over month
  const currentMonth = getMonthKey(new Date().toISOString());
  const prevDate = new Date(); prevDate.setMonth(prevDate.getMonth() - 1);
  const prevMonth = getMonthKey(prevDate.toISOString());
  const currRev = revenue(orders.filter((o) => getMonthKey(o.created_at) === currentMonth));
  const prevRev = revenue(orders.filter((o) => getMonthKey(o.created_at) === prevMonth));
  const growthPct = prevRev > 0 ? ((currRev - prevRev) / prevRev * 100).toFixed(1) : null;

  // Revenue by month (B2C + B2B stacked)
  const revenueByMonth = useMemo(() => {
    const map: Record<string, { month: string; b2c: number; b2b: number; total: number }> = {};
    periodFiltered.forEach((o) => {
      const key = getMonthKey(o.created_at);
      const label = monthLabel(o.created_at);
      if (!map[key]) map[key] = { month: label, b2c: 0, b2b: 0, total: 0 };
      const v = o.total_price_eur_cents + (o.freight_eur_cents || 0);
      map[key][o.channel === 'b2b' ? 'b2b' : 'b2c'] += v;
      map[key].total += v;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [periodFiltered]);

  // Flavor ranking
  const flavorRanking = useMemo(() => {
    const map: Record<string, { name: string; unidades: number; receita: number }> = {};
    filtered.forEach((o) => {
      (o.order_items || []).forEach((item) => {
        if (!map[item.flavor_name]) map[item.flavor_name] = { name: item.flavor_name, unidades: 0, receita: 0 };
        map[item.flavor_name].unidades += item.quantity;
        map[item.flavor_name].receita += item.line_total_eur_cents;
      });
    });
    return Object.values(map).sort((a, b) => b.unidades - a.unidades).slice(0, 15);
  }, [filtered]);

  // Commune ranking
  const communeRanking = useMemo(() => {
    const map: Record<string, { commune: string; pedidos: number; receita: number }> = {};
    filtered.forEach((o) => {
      const c = o.address_city || 'Desconhecido';
      if (!map[c]) map[c] = { commune: c, pedidos: 0, receita: 0 };
      map[c].pedidos++;
      map[c].receita += o.total_price_eur_cents + (o.freight_eur_cents || 0);
    });
    return Object.values(map).sort((a, b) => b.pedidos - a.pedidos).slice(0, 10);
  }, [filtered]);

  // By weekday
  const byWeekday = useMemo(() => {
    const counts = Array(7).fill(0);
    filtered.forEach((o) => { counts[getWeekday(o.created_at)]++; });
    return WEEKDAYS.map((dia, i) => ({ dia, pedidos: counts[i] }));
  }, [filtered]);

  // Channel comparison pie
  const channelPie = [
    { name: 'B2C — Cliente Final', value: revenue(b2cOrders) },
    { name: 'B2B — Revenda', value: revenue(b2bOrders) },
  ].filter((d) => d.value > 0);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center text-gray-400"><p className="text-4xl mb-3 animate-pulse">📊</p><p>Carregando dados...</p></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-500 hover:text-gray-700 font-medium">← Pedidos</Link>
          <span className="text-gray-300">|</span>
          <Image src="/logo.png" alt="Madame Simone" width={120} height={44} className="h-8 w-auto object-contain" />
        </div>
        <h1 className="font-bold text-gray-900 hidden sm:block">📊 Relatórios & BI</h1>
        <div className="text-xs text-gray-400">{orders.length} pedidos total</div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-600">Período:</span>
            {PERIODS.map((p) => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${period === p.key ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                style={period === p.key ? { backgroundColor: B2C_COLOR } : {}}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-600">Canal:</span>
            {[
              { key: 'all', label: 'Todos' },
              { key: 'b2c', label: '🛒 B2C' },
              { key: 'b2b', label: '🏪 B2B' },
            ].map((c) => (
              <button key={c.key} onClick={() => setChannelView(c.key as ChannelView)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${channelView === c.key ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                style={channelView === c.key ? { backgroundColor: c.key === 'b2b' ? B2B_COLOR : B2C_COLOR } : {}}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* B2C vs B2B comparison cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4 border-l-4" style={{ borderLeftColor: B2C_COLOR }}>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">B2C — Receita</p>
            <p className="text-xl font-black" style={{ color: B2C_COLOR }}>€ {toEUR(revenue(b2cOrders))}</p>
            <p className="text-xs text-gray-400 mt-1">{b2cOrders.length} pedidos · {units(b2cOrders)} un.</p>
          </div>
          <div className="card p-4 border-l-4" style={{ borderLeftColor: B2B_COLOR }}>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">B2B — Receita</p>
            <p className="text-xl font-black" style={{ color: B2B_COLOR }}>€ {toEUR(revenue(b2bOrders))}</p>
            <p className="text-xs text-gray-400 mt-1">{b2bOrders.length} pedidos · {units(b2bOrders)} un.</p>
          </div>
          <StatCard label="Total Faturamento" value={`€ ${toEUR(totalRevenue)}`} sub={`${totalOrders} pedidos`} color={B2C_COLOR} />
          <StatCard label="Ticket Médio" value={`€ ${toEUR(totalAvgTicket)}`} sub={`${totalUnits} un. total`} color={GOLD_COLOR} />
        </div>

        {/* Profit / Expense summary */}
        <div className="card p-6 border-l-4" style={{ borderLeftColor: totalProfit >= 0 ? '#059669' : '#DC2626' }}>
          <h2 className="font-bold text-gray-900 mb-4">💰 Lucro — Receita vs Despesas</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Receita Total</p>
              <p className="text-xl font-black text-green-600">+ € {toEUR(totalRevenue)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Despesas Total</p>
              <p className="text-xl font-black text-red-600">- € {toEUR(totalExpenses)}</p>
              <p className="text-xs text-gray-400 mt-1">{filteredExpenses.length} registros</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Lucro Líquido</p>
              <p className={`text-2xl font-black ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalProfit >= 0 ? '+' : '-'} € {toEUR(Math.abs(totalProfit))}
              </p>
              {totalRevenue > 0 && (
                <p className="text-xs text-gray-400 mt-1">Margem: {((totalProfit / totalRevenue) * 100).toFixed(1)}%</p>
              )}
            </div>
          </div>
          {expensesByCategory.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Despesas por Categoria</p>
              <div className="flex flex-wrap gap-3">
                {expensesByCategory.map((cat) => (
                  <div key={cat.name} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
                    <span>{cat.icon}</span>
                    <span className="text-sm font-semibold text-gray-700">{cat.name}</span>
                    <span className="text-sm font-bold" style={{ color: cat.color }}>€ {toEUR(cat.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Month comparison */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Mês Atual</p>
            <p className="text-xl font-black" style={{ color: B2C_COLOR }}>€ {toEUR(currRev)}</p>
            <p className="text-xs text-gray-400 mt-1">{orders.filter((o) => getMonthKey(o.created_at) === currentMonth).length} pedidos</p>
          </div>
          <div className="card p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Mês Anterior</p>
            <p className="text-xl font-black text-gray-700">€ {toEUR(prevRev)}</p>
            <p className="text-xs text-gray-400 mt-1">{orders.filter((o) => getMonthKey(o.created_at) === prevMonth).length} pedidos</p>
          </div>
          <div className="card p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Crescimento</p>
            {growthPct !== null ? (
              <p className={`text-xl font-black ${parseFloat(growthPct) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {parseFloat(growthPct) >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(growthPct))}%
              </p>
            ) : <p className="text-xl font-black text-gray-400">—</p>}
            <p className="text-xs text-gray-400 mt-1">vs mês anterior</p>
          </div>
        </div>

        {/* Revenue over time B2C + B2B stacked */}
        {revenueByMonth.length > 0 && (
          <div className="card p-6">
            <h2 className="font-bold text-gray-900 mb-5">📈 Faturamento por Canal ao Longo do Tempo</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueByMonth} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0e8e0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `€${(v / 100).toFixed(0)}`} tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip isCurrency />} />
                <Legend />
                <Bar dataKey="b2c" name="B2C" fill={B2C_COLOR} stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="b2b" name="B2B" fill={B2B_COLOR} stackId="a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Weekday + Channel pie */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h2 className="font-bold text-gray-900 mb-5">📅 Pedidos por Dia da Semana</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byWeekday} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0e8e0" />
                <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="pedidos" name="Pedidos" radius={[6, 6, 0, 0]}>
                  {byWeekday.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-6">
            <h2 className="font-bold text-gray-900 mb-4">📊 Receita B2C vs B2B</h2>
            {channelPie.length > 1 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={channelPie} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                    label={({ name, percent }) => `${name.split('—')[0].trim()} ${(percent * 100).toFixed(0)}%`}>
                    <Cell fill={B2C_COLOR} />
                    <Cell fill={B2B_COLOR} />
                  </Pie>
                  <Legend />
                  <Tooltip formatter={(v: number) => `€ ${toEUR(v)}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="space-y-3 mt-4">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: B2C_COLOR }} />B2C — Cliente Final</span>
                  <span className="font-bold">€ {toEUR(revenue(b2cOrders))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: B2B_COLOR }} />B2B — Revenda</span>
                  <span className="font-bold">€ {toEUR(revenue(b2bOrders))}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* B2B specific - avg order size */}
        {b2bOrders.length > 0 && (
          <div className="card p-6 border-l-4" style={{ borderLeftColor: B2B_COLOR }}>
            <h2 className="font-bold text-gray-900 mb-4">🏪 Métricas B2B</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Pedidos B2B</p>
                <p className="text-2xl font-black" style={{ color: B2B_COLOR }}>{b2bOrders.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Unidades B2B</p>
                <p className="text-2xl font-black" style={{ color: B2B_COLOR }}>{units(b2bOrders)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Ticket Médio B2B</p>
                <p className="text-2xl font-black" style={{ color: B2B_COLOR }}>€ {toEUR(avgTicket(b2bOrders))}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Média Un./Pedido</p>
                <p className="text-2xl font-black" style={{ color: B2B_COLOR }}>
                  {b2bOrders.length > 0 ? Math.round(units(b2bOrders) / b2bOrders.length) : 0}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Flavor ranking */}
        {flavorRanking.length > 0 && (
          <div className="card p-6">
            <h2 className="font-bold text-gray-900 mb-5">🍭 Ranking de Sabores — Unidades Vendidas</h2>
            <ResponsiveContainer width="100%" height={Math.max(250, flavorRanking.length * 36)}>
              <BarChart data={flavorRanking} layout="vertical" margin={{ top: 0, right: 60, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0e8e0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="unidades" name="Unidades" radius={[0, 6, 6, 0]}>
                  {flavorRanking.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Commune ranking */}
        {communeRanking.length > 0 && (
          <div className="card p-6">
            <h2 className="font-bold text-gray-900 mb-4">📍 Top Comunas</h2>
            <div className="space-y-3">
              {communeRanking.map((c, i) => (
                <div key={c.commune} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-5 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-semibold text-gray-800 truncate">{c.commune}</span>
                      <span className="text-xs text-gray-500 ml-2 shrink-0">{c.pedidos} ped. · € {toEUR(c.receita)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full" style={{
                        width: `${(c.pedidos / communeRanking[0].pedidos) * 100}%`,
                        backgroundColor: COLORS[i % COLORS.length],
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="card p-16 text-center text-gray-400">
            <p className="text-5xl mb-4">📊</p>
            <p className="text-lg font-semibold">Sem dados para o período/canal selecionado</p>
          </div>
        )}

        <div className="pb-8" />
      </div>
    </div>
  );
}
