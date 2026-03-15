'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Order } from '@/types';
import { formatEUR } from '@/lib/flavors';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderWithItems extends Order {
  order_items?: Array<{
    id: string;
    flavor_name: string;
    quantity: number;
    unit_price_eur_cents: number;
    line_total_eur_cents: number;
  }>;
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const BRAND_COLORS = ['#C41230', '#9B7A2E', '#E05A20', '#D4426A', '#8B2252', '#B87333', '#A01428', '#7A5E1E'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toEUR(cents: number) {
  return (cents / 100).toFixed(2).replace('.', ',');
}

function monthLabel(dateStr: string) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit', timeZone: 'Europe/Brussels' }).format(new Date(dateStr));
}

function weekdayLabel(dateStr: string) {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'Europe/Brussels' }).format(new Date(dateStr));
}

function getMonthKey(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getWeekday(dateStr: string) {
  return new Date(dateStr).getDay(); // 0=Sun
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = '#C41230' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-black" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label, isCurrency = false }: {
  active?: boolean; payload?: Array<{ value: number; name?: string }>; label?: string; isCurrency?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-bold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: BRAND_COLORS[i] }} className="font-semibold">
          {p.name && <span className="text-gray-500 font-normal">{p.name}: </span>}
          {isCurrency ? `€ ${toEUR(p.value)}` : p.value}
        </p>
      ))}
    </div>
  );
}

// ─── Period Filter ────────────────────────────────────────────────────────────

type Period = '7d' | '30d' | '90d' | '12m' | 'all';

const PERIODS: { key: Period; label: string }[] = [
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: '90d', label: '90 dias' },
  { key: '12m', label: '12 meses' },
  { key: 'all', label: 'Tudo' },
];

function filterByPeriod(orders: OrderWithItems[], period: Period): OrderWithItems[] {
  if (period === 'all') return orders;
  const now = new Date();
  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return orders.filter((o) => new Date(o.created_at) >= cutoff);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RelatoriosPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('30d');

  useEffect(() => {
    // Load all orders with items
    fetch('/api/admin/orders')
      .then((r) => { if (r.status === 401) { router.push('/admin/login'); throw new Error('unauth'); } return r.json(); })
      .then(async (orderList: Order[]) => {
        // Fetch items for each order in parallel (batched)
        const withItems = await Promise.all(
          orderList.map(async (o) => {
            try {
              const r = await fetch(`/api/admin/orders/${o.id}`);
              return await r.json();
            } catch {
              return o;
            }
          })
        );
        setOrders(withItems);
        setLoading(false);
      })
      .catch((e) => { if (e.message !== 'unauth') setLoading(false); });
  }, []);

  const filtered = useMemo(() => filterByPeriod(orders, period), [orders, period]);

  // ── Summary stats ──
  const totalRevenue = filtered.reduce((s, o) => s + o.total_price_eur_cents + (o.freight_eur_cents || 0), 0);
  const totalOrders = filtered.length;
  const totalUnits = filtered.reduce((s, o) => s + o.total_units, 0);
  const avgTicket = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const totalFreight = filtered.reduce((s, o) => s + (o.freight_eur_cents || 0), 0);
  const totalProduct = filtered.reduce((s, o) => s + o.total_price_eur_cents, 0);
  const ordersWithChange = filtered.filter((o) => o.needs_change).length;

  // ── Revenue by month ──
  const revenueByMonth = useMemo(() => {
    const map: Record<string, { month: string; receita: number; pedidos: number }> = {};
    filtered.forEach((o) => {
      const key = getMonthKey(o.created_at);
      const label = monthLabel(o.created_at);
      if (!map[key]) map[key] = { month: label, receita: 0, pedidos: 0 };
      map[key].receita += o.total_price_eur_cents + (o.freight_eur_cents || 0);
      map[key].pedidos += 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [filtered]);

  // ── Flavors ranking ──
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

  // ── Commune ranking ──
  const communeRanking = useMemo(() => {
    const map: Record<string, { commune: string; pedidos: number; receita: number }> = {};
    filtered.forEach((o) => {
      const c = o.address_city || 'Desconhecido';
      if (!map[c]) map[c] = { commune: c, pedidos: 0, receita: 0 };
      map[c].pedidos += 1;
      map[c].receita += o.total_price_eur_cents + (o.freight_eur_cents || 0);
    });
    return Object.values(map).sort((a, b) => b.pedidos - a.pedidos).slice(0, 10);
  }, [filtered]);

  // ── By weekday ──
  const byWeekday = useMemo(() => {
    const counts = Array(7).fill(0);
    const revenue = Array(7).fill(0);
    filtered.forEach((o) => {
      const d = getWeekday(o.created_at);
      counts[d]++;
      revenue[d] += o.total_price_eur_cents + (o.freight_eur_cents || 0);
    });
    return WEEKDAYS.map((day, i) => ({ dia: day, pedidos: counts[i], receita: revenue[i] }));
  }, [filtered]);

  // ── Month comparison ──
  const currentMonth = getMonthKey(new Date().toISOString());
  const prevDate = new Date();
  prevDate.setMonth(prevDate.getMonth() - 1);
  const prevMonth = getMonthKey(prevDate.toISOString());

  const currentMonthOrders = orders.filter((o) => getMonthKey(o.created_at) === currentMonth);
  const prevMonthOrders = orders.filter((o) => getMonthKey(o.created_at) === prevMonth);

  const currentRevenue = currentMonthOrders.reduce((s, o) => s + o.total_price_eur_cents + (o.freight_eur_cents || 0), 0);
  const prevRevenue = prevMonthOrders.reduce((s, o) => s + o.total_price_eur_cents + (o.freight_eur_cents || 0), 0);
  const growthPct = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue * 100).toFixed(1) : null;

  // ── Financial pie ──
  const financialPie = [
    { name: 'Produtos', value: totalProduct },
    { name: 'Frete', value: totalFreight },
  ].filter((d) => d.value > 0);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center text-gray-400">
        <p className="text-4xl mb-3 animate-pulse">📊</p>
        <p>Carregando dados...</p>
      </div>
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
        <h1 className="font-bold text-gray-900 text-lg hidden sm:block">📊 Relatórios & BI</h1>
        <div className="text-xs text-gray-400">{orders.length} pedidos no total</div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* Period filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-600 mr-1">Período:</span>
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                period === p.key
                  ? 'text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
              style={period === p.key ? { backgroundColor: '#C41230' } : {}}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Faturamento Total" value={`€ ${toEUR(totalRevenue)}`} sub={`${totalOrders} pedidos`} color="#C41230" />
          <StatCard label="Ticket Médio" value={`€ ${toEUR(avgTicket)}`} sub="por pedido" color="#9B7A2E" />
          <StatCard label="Unidades Vendidas" value={totalUnits.toString()} sub="geladinhos" color="#4A1E00" />
          <StatCard label="Pedidos com Troco" value={`${ordersWithChange}`} sub={`${totalOrders > 0 ? ((ordersWithChange / totalOrders) * 100).toFixed(0) : 0}% dos pedidos`} color="#E05A20" />
        </div>

        {/* Month comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Mês Atual</p>
            <p className="text-xl font-black" style={{ color: '#C41230' }}>€ {toEUR(currentRevenue)}</p>
            <p className="text-xs text-gray-400 mt-1">{currentMonthOrders.length} pedidos</p>
          </div>
          <div className="card p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Mês Anterior</p>
            <p className="text-xl font-black text-gray-700">€ {toEUR(prevRevenue)}</p>
            <p className="text-xs text-gray-400 mt-1">{prevMonthOrders.length} pedidos</p>
          </div>
          <div className="card p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Crescimento</p>
            {growthPct !== null ? (
              <p className={`text-xl font-black ${parseFloat(growthPct) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {parseFloat(growthPct) >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(growthPct))}%
              </p>
            ) : (
              <p className="text-xl font-black text-gray-400">—</p>
            )}
            <p className="text-xs text-gray-400 mt-1">vs mês anterior</p>
          </div>
        </div>

        {/* Revenue over time */}
        {revenueByMonth.length > 0 && (
          <div className="card p-6">
            <h2 className="font-bold text-gray-900 mb-5">📈 Faturamento ao Longo do Tempo</h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={revenueByMonth} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0e8e0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `€${(v / 100).toFixed(0)}`} tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip isCurrency />} />
                <Line type="monotone" dataKey="receita" stroke="#C41230" strokeWidth={3} dot={{ fill: '#C41230', r: 5 }} name="Receita" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Orders by month + weekday side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {revenueByMonth.length > 0 && (
            <div className="card p-6">
              <h2 className="font-bold text-gray-900 mb-5">📦 Pedidos por Mês</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={revenueByMonth} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0e8e0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="pedidos" fill="#C41230" radius={[6, 6, 0, 0]} name="Pedidos" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="card p-6">
            <h2 className="font-bold text-gray-900 mb-5">📅 Pedidos por Dia da Semana</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byWeekday} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0e8e0" />
                <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="pedidos" radius={[6, 6, 0, 0]} name="Pedidos">
                  {byWeekday.map((_, i) => (
                    <Cell key={i} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Flavor ranking */}
        {flavorRanking.length > 0 && (
          <div className="card p-6">
            <h2 className="font-bold text-gray-900 mb-5">🍭 Ranking de Sabores (unidades vendidas)</h2>
            <ResponsiveContainer width="100%" height={Math.max(250, flavorRanking.length * 36)}>
              <BarChart data={flavorRanking} layout="vertical" margin={{ top: 0, right: 60, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0e8e0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="unidades" radius={[0, 6, 6, 0]} name="Unidades">
                  {flavorRanking.map((_, i) => (
                    <Cell key={i} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Flavor revenue */}
        {flavorRanking.length > 0 && (
          <div className="card p-6">
            <h2 className="font-bold text-gray-900 mb-5">💰 Receita por Sabor</h2>
            <ResponsiveContainer width="100%" height={Math.max(250, flavorRanking.length * 36)}>
              <BarChart data={flavorRanking} layout="vertical" margin={{ top: 0, right: 80, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0e8e0" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `€${(v / 100).toFixed(0)}`} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
                <Tooltip content={<CustomTooltip isCurrency />} />
                <Bar dataKey="receita" radius={[0, 6, 6, 0]} name="Receita">
                  {flavorRanking.map((_, i) => (
                    <Cell key={i} fill={BRAND_COLORS[i % BRAND_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Communes + Financial pie side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

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
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${(c.pedidos / communeRanking[0].pedidos) * 100}%`,
                            backgroundColor: BRAND_COLORS[i % BRAND_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Financial breakdown */}
          <div className="card p-6">
            <h2 className="font-bold text-gray-900 mb-4">💳 Composição do Faturamento</h2>
            {financialPie.length > 1 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={financialPie} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {financialPie.map((_, i) => (
                        <Cell key={i} fill={BRAND_COLORS[i]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip formatter={(v: number) => `€ ${toEUR(v)}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Receita de produtos</span>
                    <span className="font-bold">€ {toEUR(totalProduct)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Receita de frete</span>
                    <span className="font-bold">€ {toEUR(totalFreight)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
                    <span className="font-bold text-gray-800">Total</span>
                    <span className="font-black" style={{ color: '#C41230' }}>€ {toEUR(totalRevenue)}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-3 mt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Receita de produtos</span>
                  <span className="font-bold">€ {toEUR(totalProduct)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Receita de frete</span>
                  <span className="font-bold">€ {toEUR(totalFreight)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
                  <span className="font-bold text-gray-800">Total</span>
                  <span className="font-black" style={{ color: '#C41230' }}>€ {toEUR(totalRevenue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Ticket médio</span>
                  <span className="font-bold">€ {toEUR(avgTicket)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Pedidos com troco</span>
                  <span className="font-bold">{ordersWithChange} ({totalOrders > 0 ? ((ordersWithChange / totalOrders) * 100).toFixed(0) : 0}%)</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="card p-16 text-center text-gray-400">
            <p className="text-5xl mb-4">📊</p>
            <p className="text-lg font-semibold">Sem dados para o período selecionado</p>
            <p className="text-sm mt-1">Tente ampliar o filtro de período acima.</p>
          </div>
        )}

        <div className="pb-8" />
      </div>
    </div>
  );
}
