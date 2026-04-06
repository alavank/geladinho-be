'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Order } from '@/types';
import { formatEUR } from '@/lib/flavors';
import OrdersMap from '@/components/OrdersMap';

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'Europe/Brussels',
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr));
}

function getOrderDisplayName(order: Order) {
  return order.establishment_name
    ? `${order.establishment_name} (${order.customer_name})`
    : order.customer_name;
}

function buildGoogleMapsUrl(orders: Order[]): string {
  const withCoords = orders.filter((o) => o.latitude && o.longitude);
  if (withCoords.length === 0) return '';

  // Google Maps directions URL: origin + waypoints + destination
  const origin = `${withCoords[0].latitude},${withCoords[0].longitude}`;
  const destination = `${withCoords[withCoords.length - 1].latitude},${withCoords[withCoords.length - 1].longitude}`;
  const waypoints = withCoords.slice(1, -1)
    .map((o) => `${o.latitude},${o.longitude}`)
    .join('|');

  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
  if (waypoints) url += `&waypoints=${encodeURIComponent(waypoints)}`;
  return url;
}

function buildWazeUrl(orders: Order[]): string {
  const withCoords = orders.filter((o) => o.latitude && o.longitude);
  if (withCoords.length === 0) return '';

  // Waze only supports one destination at a time
  // For multi-stop, we link to the first stop
  const first = withCoords[0];
  return `https://waze.com/ul?ll=${first.latitude},${first.longitude}&navigate=yes`;
}

function buildAddressUrl(order: Order): string {
  const addr = `${order.address_street} ${order.address_number}, ${order.address_postal_code} ${order.address_city}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
}

const B2C_COLOR = '#C41230';
const B2B_COLOR = '#0369A1';

export default function RotasPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showOnlyDeliverable, setShowOnlyDeliverable] = useState(true);

  useEffect(() => {
    fetch('/api/admin/orders')
      .then((r) => {
        if (r.status === 401) { router.push('/admin/login'); throw new Error('unauth'); }
        return r.json();
      })
      .then(setOrders)
      .catch((e: Error) => { if (e.message !== 'unauth') console.error(e); })
      .finally(() => setLoading(false));
  }, [router]);

  const availableOrders = useMemo(() => {
    let filtered = orders;
    if (showOnlyDeliverable) {
      filtered = filtered.filter((o) => o.status === 'em_preparo' || o.status === 'em_rota' || o.status === 'novo');
    }
    return filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [orders, showOnlyDeliverable]);

  const selectedOrders = useMemo(() => {
    return Array.from(selectedIds)
      .map((id) => orders.find((o) => o.id === id))
      .filter(Boolean) as Order[];
  }, [orders, selectedIds]);

  const routeMarkers = useMemo(() => {
    return selectedOrders
      .filter((o) => o.latitude && o.longitude)
      .map((o, i) => ({
        lat: o.latitude!,
        lng: o.longitude!,
        title: `${i + 1}. ${getOrderDisplayName(o)}`,
        info: `${o.address_street} ${o.address_number}, ${o.address_city}`,
        color: o.channel === 'b2b' ? B2B_COLOR : B2C_COLOR,
        label: String(i + 1),
      }));
  }, [selectedOrders]);

  const toggleOrder = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(availableOrders.map((o) => o.id)));
  };

  const clearAll = () => {
    setSelectedIds(new Set());
  };

  const moveUp = (id: string) => {
    const arr = Array.from(selectedIds);
    const idx = arr.indexOf(id);
    if (idx <= 0) return;
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    setSelectedIds(new Set(arr));
  };

  const moveDown = (id: string) => {
    const arr = Array.from(selectedIds);
    const idx = arr.indexOf(id);
    if (idx < 0 || idx >= arr.length - 1) return;
    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    setSelectedIds(new Set(arr));
  };

  const googleMapsUrl = useMemo(() => buildGoogleMapsUrl(selectedOrders), [selectedOrders]);
  const wazeUrl = useMemo(() => buildWazeUrl(selectedOrders), [selectedOrders]);

  const totalUnits = selectedOrders.reduce((s, o) => s + o.total_units, 0);
  const totalValue = selectedOrders.reduce((s, o) => s + o.total_price_eur_cents + (o.freight_eur_cents || 0), 0);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">⏳ Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-500 hover:text-gray-700 font-medium">← Pedidos</Link>
          <span className="text-gray-300">|</span>
          <Image src="/logo.png" alt="Madame Simone" width={120} height={44} className="h-8 w-auto object-contain hidden sm:block" />
        </div>
        <h1 className="font-bold text-gray-900">🚗 Montar Rota</h1>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
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
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedIds.has(o.id) ? 'bg-orange-50 border border-orange-200' : 'bg-white border border-gray-100 hover:bg-gray-50'}`}>
                    <input type="checkbox" checked={selectedIds.has(o.id)}
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

            {/* Navigation buttons */}
            {selectedOrders.length > 0 && (
              <div className="card p-4">
                <h3 className="font-bold text-gray-900 mb-3">🧭 Navegar</h3>
                <div className="flex gap-3">
                  {googleMapsUrl && (
                    <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer"
                      className="flex-1 btn-primary py-2.5 text-center text-sm">
                      🗺️ Google Maps
                    </a>
                  )}
                  {wazeUrl && (
                    <a href={wazeUrl} target="_blank" rel="noopener noreferrer"
                      className="flex-1 py-2.5 text-center text-sm font-semibold rounded-xl border-2 border-blue-500 text-blue-600 hover:bg-blue-50 transition-colors">
                      🚗 Waze
                    </a>
                  )}
                </div>
                {selectedOrders.filter((o) => !o.latitude).length > 0 && (
                  <p className="text-xs text-amber-600 mt-2">⚠️ {selectedOrders.filter((o) => !o.latitude).length} pedido(s) sem coordenadas serão ignorados na navegação.</p>
                )}
              </div>
            )}

            {/* Route order (reorderable list) */}
            {selectedOrders.length > 0 && (
              <div className="card p-4">
                <h3 className="font-bold text-gray-900 mb-3">📍 Ordem da Rota</h3>
                <p className="text-xs text-gray-500 mb-3">Arraste para reordenar as paradas.</p>
                <div className="space-y-1">
                  {selectedOrders.map((o, i) => (
                    <div key={o.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
                      <span className="w-6 h-6 rounded-full bg-orange-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{getOrderDisplayName(o)}</p>
                        <p className="text-xs text-gray-500 truncate">{o.address_street} {o.address_number}, {o.address_city}</p>
                      </div>
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button onClick={() => moveUp(o.id)} disabled={i === 0}
                          className="text-gray-400 hover:text-gray-700 disabled:opacity-20 text-xs">▲</button>
                        <button onClick={() => moveDown(o.id)} disabled={i === selectedOrders.length - 1}
                          className="text-gray-400 hover:text-gray-700 disabled:opacity-20 text-xs">▼</button>
                      </div>
                      <a href={buildAddressUrl(o)} target="_blank" rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700 text-xs shrink-0" title="Ver no mapa">
                        📍
                      </a>
                    </div>
                  ))}
                </div>
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
      </div>
    </div>
  );
}
