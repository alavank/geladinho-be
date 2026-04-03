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

  if (loading || !order) return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>Carregando...</div>
  );

  const freightCents = order.freight_eur_cents || 0;
  const grandTotal = order.total_price_eur_cents + freightCents;
  const shortId = order.id.substring(0, 8).toUpperCase();
  const items = order.order_items || [];
  const temMaos = order.change_amount_eur_cents || 0;
  const troco = Math.max(0, temMaos - grandTotal);

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1a1a1a; background: #fff; }
        .page { width: 210mm; max-height: 297mm; overflow: hidden; margin: 0 auto; padding: 10mm 13mm; }
        .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; margin-bottom: 10px; border-bottom: 3px solid #C41230; }
        .logo-img { height: 40px; width: auto; }
        .bon-info { text-align: right; }
        .bon-info h2 { font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #C41230; }
        .bon-info p { font-size: 10px; color: #555; margin-top: 2px; }
        .section { margin-bottom: 8px; }
        .section-title { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #9B7A2E; border-bottom: 1px solid #F5E8D0; padding-bottom: 3px; margin-bottom: 6px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 20px; }
        .info-row { display: flex; flex-direction: column; }
        .info-label { font-size: 9px; color: #888; margin-bottom: 1px; }
        .info-value { font-size: 11px; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #C41230; color: #fff; padding: 4px 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
        th.right, td.right { text-align: right; }
        th.center, td.center { text-align: center; }
        td { padding: 3px 8px; border-bottom: 1px solid #f0e8e0; font-size: 10px; }
        tr:nth-child(even) td { background: #FDF6EC; }
        .totals { margin-top: 8px; margin-left: auto; width: 240px; }
        .total-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 11px; border-bottom: 1px solid #f0e8e0; }
        .total-row.grand { font-size: 14px; font-weight: 900; border-bottom: none; border-top: 3px solid #C41230; padding-top: 6px; margin-top: 4px; color: #C41230; }
        .troco-box { background: #FFF7ED; border: 1px solid #FED7AA; border-radius: 6px; padding: 6px 10px; font-size: 10px; color: #9A3412; }
        .footer { margin-top: 10px; border-top: 1px solid #f0e8e0; padding-top: 6px; text-align: center; font-size: 9px; color: #bbb; }
        .print-btn { position: fixed; bottom: 20px; right: 20px; background: #C41230; color: #fff; border: none; border-radius: 10px; padding: 12px 22px; font-weight: 700; cursor: pointer; font-size: 14px; box-shadow: 0 4px 16px rgba(196,18,48,0.3); }
        .print-btn:hover { background: #A00D27; }
        @media print {
          @page { size: A4; margin: 0; }
          .page { padding: 10mm 13mm; }
          .print-btn { display: none; }
        }
      `}</style>

      <div className="page">
        <div className="header">
          <img src="/logo.png" alt="Madame Simone" className="logo-img" />
          <div className="bon-info">
            <h2>Bon de Commande</h2>
            <p>N° {shortId}</p>
            <p>{formatDate(order.created_at)}</p>
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
              Cliente tem <strong>{formatEUR(temMaos)}</strong> em mãos — Levar <strong>{formatEUR(troco)}</strong> de troco
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
            <p style={{ fontStyle: 'italic', color: '#555' }}>{order.notes}</p>
          </div>
        )}

        <div className="footer">
          Madame Simone — Produits Alimentaires · Pedido #{shortId} · {formatDate(order.created_at)}
        </div>
      </div>

      <button className="print-btn" onClick={() => window.print()}>
        🖨️ Imprimir / Salvar PDF
      </button>
    </>
  );
}
