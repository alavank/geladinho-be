'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Order } from '@/types';
import { formatEUR } from '@/lib/flavors';

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('fr-BE', {
    timeZone: 'Europe/Brussels',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr));
}

export default function BonDeCommandePage() {
  const params = useParams();
  const id = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/orders/${id}`)
      .then((r) => r.json())
      .then((data) => { setOrder(data); setLoading(false); });
  }, [id]);

  if (loading || !order) {
    return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>Carregando...</div>;
  }

  const freightCents = order.freight_eur_cents || 0;
  const grandTotal = order.total_price_eur_cents + freightCents;
  const shortId = order.id.substring(0, 8).toUpperCase();
  const items = order.order_items || [];

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #111; background: #fff; }
        .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 20mm 18mm; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #111; padding-bottom: 14px; margin-bottom: 20px; }
        .logo-block h1 { font-size: 26px; font-weight: 900; letter-spacing: -1px; }
        .bon-title { text-align: right; }
        .bon-title h2 { font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; }
        .bon-title p { font-size: 11px; color: #555; margin-top: 4px; }
        .section { margin-bottom: 18px; }
        .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #777; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 10px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
        .info-row { display: flex; flex-direction: column; }
        .info-label { font-size: 10px; color: #888; margin-bottom: 2px; }
        .info-value { font-size: 13px; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #111; color: #fff; padding: 7px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
        th.right, td.right { text-align: right; }
        th.center, td.center { text-align: center; }
        td { padding: 7px 10px; border-bottom: 1px solid #eee; font-size: 12px; }
        tr:nth-child(even) td { background: #f9f9f9; }
        .totals { margin-top: 16px; margin-left: auto; width: 260px; }
        .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; border-bottom: 1px solid #eee; }
        .total-row.grand { font-size: 16px; font-weight: 900; border-bottom: none; border-top: 3px solid #111; padding-top: 10px; margin-top: 6px; }
        .troco-box { background: #fffbe6; border: 1px solid #f59e0b; border-radius: 6px; padding: 10px 14px; font-size: 12px; }
        .footer { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 12px; text-align: center; font-size: 10px; color: #aaa; }
        .print-btn { position: fixed; bottom: 20px; right: 20px; background: #111; color: #fff; border: none; border-radius: 8px; padding: 12px 22px; font-weight: 700; cursor: pointer; font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
        .print-btn:hover { background: #333; }
        @media print {
          @page { size: A4; margin: 0; }
          .page { padding: 15mm 14mm; }
          .print-btn { display: none; }
        }
      `}</style>

      <div className="page">
        <div className="header">
          <div className="logo-block">
            <h1>Geladinho Madamme Simone</h1>
          </div>
          <div className="bon-title">
            <h2>Bon de Commande</h2>
            <p>N° {shortId}</p>
            <p style={{ marginTop: 4 }}>{formatDate(order.created_at)}</p>
          </div>
        </div>

        <div className="section">
          <div className="section-title">Informações do Cliente</div>
          <div className="info-grid">
            <div className="info-row">
              <span className="info-label">Nome completo</span>
              <span className="info-value">{order.customer_name}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Telefone (WhatsApp)</span>
              <span className="info-value">{order.customer_phone_e164}</span>
            </div>
            <div className="info-row" style={{ gridColumn: '1 / -1' }}>
              <span className="info-label">Endereço de entrega</span>
              <span className="info-value">
                {order.address_street}, {order.address_number} — {order.address_postal_code} {order.address_city}, Bélgica
              </span>
            </div>
          </div>
        </div>

        {order.needs_change && (
          <div className="section">
            <div className="section-title">Troco</div>
            <div className="troco-box">
              Troco para: <strong>{formatEUR(order.change_amount_eur_cents || 0)}</strong>
            </div>
          </div>
        )}

        <div className="section">
          <div className="section-title">Itens do Pedido</div>
          <table>
            <thead>
              <tr>
                <th>Sabor</th>
                <th className="center">Qtd</th>
                <th className="right">Preço Unit.</th>
                <th className="right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.flavor_name}</td>
                  <td className="center">{item.quantity}</td>
                  <td className="right">{formatEUR(item.unit_price_eur_cents)}</td>
                  <td className="right">{formatEUR(item.line_total_eur_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="totals">
            <div className="total-row">
              <span>Subtotal ({order.total_units} un.)</span>
              <span>{formatEUR(order.total_price_eur_cents)}</span>
            </div>
            <div className="total-row">
              <span>Frete</span>
              <span>{formatEUR(freightCents)}</span>
            </div>
            <div className="total-row grand">
              <span>TOTAL</span>
              <span>{formatEUR(grandTotal)}</span>
            </div>
          </div>
        </div>

        {order.notes && (
          <div className="section">
            <div className="section-title">Observações</div>
            <p style={{ fontStyle: 'italic', color: '#444' }}>{order.notes}</p>
          </div>
        )}

        <div className="footer">
          Geladinho Madamme Simone · Pedido #{shortId} · {formatDate(order.created_at)}
        </div>
      </div>

      <button className="print-btn" onClick={() => window.print()}>
        🖨️ Imprimir / Salvar PDF
      </button>
    </>
  );
}
