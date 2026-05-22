'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '@/components/AdminHeader';
import { useIsAdminModuleActive } from '@/components/admin/AdminShellContext';
import { Order, SavedRoute } from '@/types';
import { formatEUR } from '@/lib/flavors';
import OrdersMap from '@/components/OrdersMap';

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'Europe/Brussels',
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr));
}

function formatDateShort(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'Europe/Brussels',
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(dateStr));
}

function getOrderDisplayName(order: Order) {
  return order.establishment_name
    ? `${order.establishment_name} (${order.customer_name})`
    : order.customer_name;
}

function getOrderAddress(order: Order) {
  return `${order.address_street} ${order.address_number}, ${order.address_postal_code} ${order.address_city}`;
}

const DEFAULT_ORIGIN = 'Rue de la Vérité 45A, 1070 Anderlecht, Belgique';

function buildGoogleMapsUrl(origin: string, orders: Order[]): string {
  if (orders.length === 0) return '';
  const stops = orders.map((o) =>
    o.latitude && o.longitude
      ? `${o.latitude},${o.longitude}`
      : encodeURIComponent(getOrderAddress(o))
  );
  const destination = stops[stops.length - 1];
  const waypoints = stops.slice(0, -1).join('|');
  const originEncoded = encodeURIComponent(origin);
  let url = `https://www.google.com/maps/dir/?api=1&origin=${originEncoded}&destination=${destination}&travelmode=driving`;
  if (waypoints) url += `&waypoints=${encodeURIComponent(waypoints)}`;
  return url;
}

function buildWazeUrls(origin: string, orders: Order[]): { from: string; to: string; url: string }[] {
  const stops: { name: string; ll: string | null; addr: string }[] = [
    { name: 'Ponto de partida', ll: null, addr: origin },
    ...orders.map((o) => ({
      name: getOrderDisplayName(o),
      ll: o.latitude && o.longitude ? `${o.latitude},${o.longitude}` : null,
      addr: getOrderAddress(o),
    })),
  ];
  const links: { from: string; to: string; url: string }[] = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const dest = stops[i + 1];
    const url = dest.ll
      ? `https://waze.com/ul?ll=${dest.ll}&navigate=yes`
      : `https://waze.com/ul?q=${encodeURIComponent(dest.addr)}&navigate=yes`;
    links.push({ from: stops[i].name, to: dest.name, url });
  }
  return links;
}

const B2C_COLOR = '#C41230';
const B2B_COLOR = '#0369A1';

type View = 'list' | 'build' | 'detail';

export default function RotasPage() {
  const router = useRouter();
  const isActiveModule = useIsAdminModuleActive('/gestion/rotas');
  const [view, setView] = useState<View>('list');
  const [orders, setOrders] = useState<Order[]>([]);
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [loading, setLoading] = useState(true);

  // Build mode state
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [showOnlyDeliverable, setShowOnlyDeliverable] = useState(true);
  const [origin, setOrigin] = useState(DEFAULT_ORIGIN);
  const [editingOrigin, setEditingOrigin] = useState(false);
  const [originDraft, setOriginDraft] = useState(DEFAULT_ORIGIN);
  const [generatedGoogleUrl, setGeneratedGoogleUrl] = useState('');
  const [generatedWazeLinks, setGeneratedWazeLinks] = useState<{ from: string; to: string; url: string }[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Save modal
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [saving, setSaving] = useState(false);

  // Detail mode
  const [activeRoute, setActiveRoute] = useState<SavedRoute | null>(null);
  const lastFetchedAtRef = useRef(0);

  const fetchAll = useCallback(async (force = false) => {
    if (!force && lastFetchedAtRef.current > 0 && Date.now() - lastFetchedAtRef.current < 45000) {
      return;
    }

    const [ordersRes, routesRes] = await Promise.all([
      fetch('/api/gestion/orders'),
      fetch('/api/gestion/routes'),
    ]);
    if (ordersRes.status === 401) { router.push('/gestion/login'); return; }
    setOrders(await ordersRes.json());
    setSavedRoutes(await routesRes.json());
    lastFetchedAtRef.current = Date.now();
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (!isActiveModule) return;
    void fetchAll();
  }, [fetchAll, isActiveModule]);

  // Build mode helpers
  const availableOrders = useMemo(() => {
    let filtered = orders;
    if (showOnlyDeliverable) {
      filtered = filtered.filter((o) => o.status === 'em_preparo' || o.status === 'em_rota' || o.status === 'novo');
    }
    return filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [orders, showOnlyDeliverable]);

  const selectedSet = useMemo(() => new Set(orderedIds), [orderedIds]);

  const selectedOrders = useMemo(() => {
    return orderedIds.map((id) => orders.find((o) => o.id === id)).filter(Boolean) as Order[];
  }, [orders, orderedIds]);

  const routeMarkers = useMemo(() => {
    return selectedOrders
      .filter((o) => o.latitude && o.longitude)
      .map((o, i) => ({
        lat: o.latitude!, lng: o.longitude!,
        title: `${i + 1}. ${getOrderDisplayName(o)}`,
        info: `${o.address_street} ${o.address_number}, ${o.address_city}`,
        color: o.channel === 'b2b' ? B2B_COLOR : B2C_COLOR,
        label: String(i + 1),
      }));
  }, [selectedOrders]);

  const toggleOrder = (id: string) => {
    setOrderedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    setGeneratedGoogleUrl('');
    setGeneratedWazeLinks([]);
  };

  const selectAll = () => { setOrderedIds(availableOrders.map((o) => o.id)); setGeneratedGoogleUrl(''); setGeneratedWazeLinks([]); };
  const clearAll = () => { setOrderedIds([]); setGeneratedGoogleUrl(''); setGeneratedWazeLinks([]); };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => { e.preventDefault(); setDragOverIndex(index); };
  const handleDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) { setDragIndex(null); setDragOverIndex(null); return; }
    setOrderedIds((prev) => { const next = [...prev]; const [moved] = next.splice(dragIndex, 1); next.splice(index, 0, moved); return next; });
    setDragIndex(null); setDragOverIndex(null); setGeneratedGoogleUrl(''); setGeneratedWazeLinks([]);
  };
  const handleDragEnd = () => { setDragIndex(null); setDragOverIndex(null); };

  const handleGenerateGoogle = () => setGeneratedGoogleUrl(buildGoogleMapsUrl(origin, selectedOrders));
  const handleGenerateWaze = () => setGeneratedWazeLinks(buildWazeUrls(origin, selectedOrders));

  const handleSaveOrigin = () => {
    setOrigin(originDraft.trim() || DEFAULT_ORIGIN);
    setEditingOrigin(false);
    setGeneratedGoogleUrl(''); setGeneratedWazeLinks([]);
  };

  const totalUnits = selectedOrders.reduce((s, o) => s + o.total_units, 0);
  const totalValue = selectedOrders.reduce((s, o) => s + o.total_price_eur_cents + (o.freight_eur_cents || 0), 0);

  // Save route
  const handleSaveRoute = async () => {
    if (!routeName.trim()) return;
    setSaving(true);

    const googleUrl = generatedGoogleUrl || buildGoogleMapsUrl(origin, selectedOrders);
    const wazeLinks = generatedWazeLinks.length > 0 ? generatedWazeLinks : buildWazeUrls(origin, selectedOrders);

    const res = await fetch('/api/gestion/routes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: routeName.trim(),
        origin,
        order_ids: orderedIds,
        google_maps_url: googleUrl,
        waze_links: wazeLinks,
      }),
    });

    if (res.ok) {
      setShowSaveModal(false);
      setRouteName('');
      setOrderedIds([]);
      setGeneratedGoogleUrl('');
      setGeneratedWazeLinks([]);
      await fetchAll(true);
      setView('list');
    } else {
      const data = await res.json();
      alert(data.error || 'Erro ao salvar');
    }
    setSaving(false);
  };

  // Delete route
  const handleDeleteRoute = async (id: string) => {
    if (!confirm('Excluir esta rota?')) return;
    const res = await fetch(`/api/gestion/routes/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setSavedRoutes((prev) => prev.filter((r) => r.id !== id));
      lastFetchedAtRef.current = Date.now();
      if (activeRoute?.id === id) { setActiveRoute(null); setView('list'); }
    } else alert('Erro ao excluir');
  };

  // Open detail
  const openRouteDetail = (route: SavedRoute) => {
    setActiveRoute(route);
    setView('detail');
  };

  // Start new route
  const startNewRoute = () => {
    setOrderedIds([]);
    setGeneratedGoogleUrl('');
    setGeneratedWazeLinks([]);
    setOrigin(DEFAULT_ORIGIN);
    setView('build');
  };

  // Detail view helpers
  const detailOrders = useMemo(() => {
    if (!activeRoute) return [];
    return activeRoute.order_ids.map((id) => orders.find((o) => o.id === id)).filter(Boolean) as Order[];
  }, [activeRoute, orders]);

  const detailMarkers = useMemo(() => {
    return detailOrders
      .filter((o) => o.latitude && o.longitude)
      .map((o, i) => ({
        lat: o.latitude!, lng: o.longitude!,
        title: `${i + 1}. ${getOrderDisplayName(o)}`,
        info: `${o.address_street} ${o.address_number}, ${o.address_city}`,
        color: o.channel === 'b2b' ? B2B_COLOR : B2C_COLOR,
        label: String(i + 1),
      }));
  }, [detailOrders]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">⏳ Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader
        breadcrumbs={[
          { label: 'Pedidos', href: '/gestion' },
          { label: 'Rotas de Entrega' },
        ]}
        actions={
          view !== 'list' ? (
            <button onClick={() => setView('list')} className="text-sm font-semibold text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">
              Rotas Salvas
            </button>
          ) : undefined
        }
      />

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* ========== LIST VIEW ========== */}
        {view === 'list' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Rotas Salvas ({savedRoutes.length})</h2>
              <button onClick={startNewRoute} className="btn-primary py-2.5 px-5 text-sm">
                + Nova Rota
              </button>
            </div>

            {savedRoutes.length === 0 ? (
              <div className="card p-16 text-center text-gray-400">
                <p className="text-5xl mb-4">🚗</p>
                <p className="text-lg font-semibold mb-2">Nenhuma rota salva</p>
                <p className="text-sm">Monte sua primeira rota clicando no botão acima.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {savedRoutes.map((route) => {
                  const routeOrders = route.order_ids.map((id) => orders.find((o) => o.id === id)).filter(Boolean) as Order[];
                  const units = routeOrders.reduce((s, o) => s + o.total_units, 0);
                  return (
                    <div key={route.id} className="card p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => openRouteDetail(route)}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-gray-900">{route.name}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">{formatDateShort(route.created_at)}</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteRoute(route.id); }}
                          className="text-red-400 hover:text-red-600 p-1 rounded-lg transition-colors" title="Excluir">
                          🗑️
                        </button>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">Paradas</p>
                          <p className="font-bold text-orange-600">{route.order_ids.length}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Unidades</p>
                          <p className="font-bold text-blue-600">{units}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-3 truncate">📍 {route.origin.split(',')[0]}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ========== DETAIL VIEW ========== */}
        {view === 'detail' && activeRoute && (
          <>
            <div className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{activeRoute.name}</h2>
                  <p className="text-sm text-gray-500 mt-1">Criada em {formatDateShort(activeRoute.created_at)}</p>
                </div>
                <button onClick={() => handleDeleteRoute(activeRoute.id)}
                  className="px-4 py-1.5 text-sm font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                  🗑️ Excluir
                </button>
              </div>

              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">📍 Ponto de Partida</p>
              <p className="text-sm font-medium text-gray-900 mb-4">{activeRoute.origin}</p>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Paradas</p>
                  <p className="text-2xl font-black text-orange-600">{detailOrders.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Unidades</p>
                  <p className="text-2xl font-black text-blue-600">{detailOrders.reduce((s, o) => s + o.total_units, 0)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Valor</p>
                  <p className="text-xl font-black text-green-600">{formatEUR(detailOrders.reduce((s, o) => s + o.total_price_eur_cents + (o.freight_eur_cents || 0), 0))}</p>
                </div>
              </div>
            </div>

            {/* Stops */}
            <div className="card p-4">
              <h3 className="font-bold text-gray-900 mb-3">📍 Paradas ({detailOrders.length})</h3>
              <div className="space-y-1">
                {detailOrders.map((o, i) => (
                  <div key={o.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
                    <span className="w-6 h-6 rounded-full bg-orange-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{getOrderDisplayName(o)}</p>
                      <p className="text-xs text-gray-500 truncate">{getOrderAddress(o)}</p>
                    </div>
                    <p className="text-xs font-bold text-orange-600 shrink-0">{o.total_units} un.</p>
                  </div>
                ))}
                {activeRoute.order_ids.length > detailOrders.length && (
                  <p className="text-xs text-amber-600 mt-2">⚠️ {activeRoute.order_ids.length - detailOrders.length} pedido(s) não encontrado(s) — podem ter sido excluídos.</p>
                )}
              </div>
            </div>

            {/* Navigation links */}
            <div className="card p-4">
              <h3 className="font-bold text-gray-900 mb-3">🧭 Links de Navegação</h3>

              {activeRoute.google_maps_url && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                  <p className="text-xs font-semibold text-green-700 uppercase mb-1">🗺️ Rota Google Maps</p>
                  <a href={activeRoute.google_maps_url} target="_blank" rel="noopener noreferrer"
                    className="inline-block bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">
                    Abrir no Google Maps →
                  </a>
                </div>
              )}

              {activeRoute.waze_links && activeRoute.waze_links.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-700 uppercase mb-2">🚗 Rotas Waze (trecho a trecho)</p>
                  <div className="space-y-2">
                    {activeRoute.waze_links.map((link, i) => (
                      <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 rounded-lg bg-white border border-blue-100 hover:border-blue-300 hover:bg-blue-50 transition-colors">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 truncate">{link.from}</p>
                          <p className="text-sm text-blue-700 font-medium truncate">→ {link.to}</p>
                        </div>
                        <span className="text-blue-500 text-xs shrink-0">Abrir</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Map */}
            {detailMarkers.length > 0 && (
              <div className="card p-4">
                <h3 className="font-bold text-gray-900 mb-3">🗺️ Mapa da Rota</h3>
                <OrdersMap markers={detailMarkers} height="400px" />
              </div>
            )}
          </>
        )}

        {/* ========== BUILD VIEW ========== */}
        {view === 'build' && (
          <>
            {/* Starting point */}
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">📍 Ponto de Partida</p>
                  {editingOrigin ? (
                    <div className="flex gap-2 items-center">
                      <input className="input-field flex-1" value={originDraft}
                        onChange={(e) => setOriginDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveOrigin(); }} />
                      <button onClick={handleSaveOrigin} className="btn-primary py-2 px-4 text-sm">Salvar</button>
                      <button onClick={() => { setEditingOrigin(false); setOriginDraft(origin); }}
                        className="text-gray-500 hover:text-gray-700 text-sm font-semibold">Cancelar</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <p className="font-medium text-gray-900">{origin}</p>
                      <button onClick={() => { setOriginDraft(origin); setEditingOrigin(true); }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold shrink-0">
                        Mudar ponto de partida
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Order selection */}
              <div className="space-y-4">
                <div className="card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-bold text-gray-900">📋 Pedidos Disponíveis</h2>
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input type="checkbox" checked={showOnlyDeliverable}
                        onChange={(e) => setShowOnlyDeliverable(e.target.checked)}
                        className="rounded border-gray-300" />
                      Só pendentes
                    </label>
                  </div>
                  <div className="flex gap-2 mb-3">
                    <button onClick={selectAll} className="text-xs text-blue-600 hover:text-blue-800 font-semibold">Selecionar todos</button>
                    <span className="text-gray-300">|</span>
                    <button onClick={clearAll} className="text-xs text-gray-500 hover:text-gray-700 font-semibold">Limpar</button>
                  </div>

                  <div className="max-h-[400px] overflow-y-auto space-y-1">
                    {availableOrders.length === 0 ? (
                      <p className="text-center text-gray-400 py-6">Nenhum pedido disponível.</p>
                    ) : availableOrders.map((o) => (
                      <label key={o.id}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedSet.has(o.id) ? 'bg-orange-50 border border-orange-200' : 'bg-white border border-gray-100 hover:bg-gray-50'}`}>
                        <input type="checkbox" checked={selectedSet.has(o.id)}
                          onChange={() => toggleOrder(o.id)}
                          className="rounded border-gray-300 text-orange-600 focus:ring-orange-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{getOrderDisplayName(o)}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {o.address_street} {o.address_number}, {o.address_city}
                            {!o.latitude && ' ⚠️ sem coordenadas'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-orange-600">{o.total_units} un.</p>
                          <p className="text-xs text-gray-400">{formatDate(o.created_at)}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Route details */}
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="card p-4 text-center">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Paradas</p>
                    <p className="text-2xl font-black text-orange-600">{selectedOrders.length}</p>
                  </div>
                  <div className="card p-4 text-center">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Unidades</p>
                    <p className="text-2xl font-black text-blue-600">{totalUnits}</p>
                  </div>
                  <div className="card p-4 text-center">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Valor Total</p>
                    <p className="text-xl font-black text-green-600">{formatEUR(totalValue)}</p>
                  </div>
                </div>

                {/* Route order (drag-and-drop) */}
                {selectedOrders.length > 0 && (
                  <div className="card p-4">
                    <h3 className="font-bold text-gray-900 mb-2">📍 Ordem da Rota</h3>
                    <p className="text-xs text-gray-500 mb-3">Arraste os cards para reordenar as paradas.</p>
                    <div className="space-y-1">
                      {selectedOrders.map((o, i) => (
                        <div key={o.id}
                          draggable
                          onDragStart={() => handleDragStart(i)}
                          onDragOver={(e) => handleDragOver(e, i)}
                          onDrop={() => handleDrop(i)}
                          onDragEnd={handleDragEnd}
                          className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-grab active:cursor-grabbing ${
                            dragOverIndex === i ? 'border-orange-400 bg-orange-50' :
                            dragIndex === i ? 'opacity-50 border-gray-200 bg-gray-100' :
                            'border-gray-100 bg-gray-50'
                          }`}>
                          <span className="text-gray-400 cursor-grab select-none shrink-0">⠿</span>
                          <span className="w-6 h-6 rounded-full bg-orange-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{getOrderDisplayName(o)}</p>
                            <p className="text-xs text-gray-500 truncate">{getOrderAddress(o)}</p>
                          </div>
                          <button onClick={() => toggleOrder(o.id)}
                            className="text-gray-400 hover:text-red-500 shrink-0 text-xs" title="Remover">✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Generate + Save */}
                {selectedOrders.length > 0 && (
                  <div className="card p-4">
                    <h3 className="font-bold text-gray-900 mb-3">🧭 Gerar Links de Navegação</h3>
                    <div className="flex gap-3 mb-4">
                      <button onClick={handleGenerateGoogle} className="flex-1 btn-primary py-2.5 text-center text-sm">
                        🗺️ Gerar Rota Google Maps
                      </button>
                      <button onClick={handleGenerateWaze}
                        className="flex-1 py-2.5 text-center text-sm font-semibold rounded-xl border-2 border-blue-500 text-blue-600 hover:bg-blue-50 transition-colors">
                        🚗 Gerar Links Waze
                      </button>
                    </div>

                    {generatedGoogleUrl && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                        <p className="text-xs font-semibold text-green-700 uppercase mb-1">🗺️ Rota Google Maps</p>
                        <p className="text-xs text-green-800 mb-2">{selectedOrders.length} paradas a partir de {origin.split(',')[0]}</p>
                        <a href={generatedGoogleUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-block bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">
                          Abrir no Google Maps →
                        </a>
                      </div>
                    )}

                    {generatedWazeLinks.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                        <p className="text-xs font-semibold text-blue-700 uppercase mb-2">🚗 Rotas Waze (trecho a trecho)</p>
                        <div className="space-y-2">
                          {generatedWazeLinks.map((link, i) => (
                            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 rounded-lg bg-white border border-blue-100 hover:border-blue-300 hover:bg-blue-50 transition-colors">
                              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                                {i + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-500 truncate">{link.from}</p>
                                <p className="text-sm text-blue-700 font-medium truncate">→ {link.to}</p>
                              </div>
                              <span className="text-blue-500 text-xs shrink-0">Abrir</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Save button */}
                    <button onClick={() => { setRouteName(''); setShowSaveModal(true); }}
                      className="w-full py-3 text-center font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl transition-colors text-sm mt-2">
                      💾 Salvar Rota
                    </button>
                  </div>
                )}

                {/* Map */}
                {routeMarkers.length > 0 && (
                  <div className="card p-4">
                    <h3 className="font-bold text-gray-900 mb-3">🗺️ Visualização da Rota</h3>
                    <OrdersMap markers={routeMarkers} height="350px" />
                  </div>
                )}

                {selectedOrders.length === 0 && (
                  <div className="card p-12 text-center text-gray-400">
                    <p className="text-4xl mb-3">🚗</p>
                    <p className="font-semibold">Selecione pedidos para montar a rota</p>
                    <p className="text-xs mt-1">Marque os pedidos na lista ao lado para começar.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Save Route Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">💾 Salvar Rota</h3>
            <div className="mb-4">
              <label className="label">Nome da Rota *</label>
              <input className="input-field" placeholder="Ex: Rota Schaerbeek + Waterloo"
                value={routeName} onChange={(e) => setRouteName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRoute(); }}
                autoFocus />
            </div>
            <p className="text-xs text-gray-500 mb-4">
              {selectedOrders.length} paradas · {totalUnits} unidades · {formatEUR(totalValue)}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowSaveModal(false)}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSaveRoute}
                disabled={!routeName.trim() || saving}
                className="flex-1 btn-primary py-2 disabled:opacity-40">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
