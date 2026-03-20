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

export default function BonRevendaPage() {
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
        body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #1a1a1a; background: #fff; }
        .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 18mm 16mm; }

        .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 16px; margin-bottom: 20px; border-bottom: 3px solid #0369A1; }
        .logo-img { height: 56px; width: auto; }
        .bon-info { text-align: right; }
        .bon-info .badge { display: inline-block; background: #0369A1; color: white; font-size: 10px; font-weight: 700; padding: 3px 12px; border-radius: 20px; margin-bottom: 6px; letter-spacing: 1px; text-transform: uppercase; }
        .bon-info h2 { font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #0369A1; }
        .bon-info p { font-size: 11px; color: #555; margin-top: 3px; }

        .section { margin-bottom: 18px; }
        .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #0369A1; border-bottom: 1px solid #BFDBFE; padding-bottom: 4px; margin-bottom: 10px; }

        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
        .info-row { display: flex; flex-direction: column; }
        .info-label { font-size: 10px; color: #888; margin-bottom: 2px; }
        .info-value { font-size: 13px; font-weight: 600; }

        table { width: 100%; border-collapse: collapse; }
        th { background: #0369A1; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
        th.right, td.right { text-align: right; }
        th.center, td.center { text-align: center; }
        td { padding: 8px 10px; border-bottom: 1px solid #EFF6FF; font-size: 12px; }
        tr:nth-child(even) td { background: #F0F9FF; }

        .totals { margin-top: 16px; margin-left: auto; width: 270px; }
        .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; border-bottom: 1px solid #EFF6FF; }
        .total-row.grand { font-size: 17px; font-weight: 900; border-bottom: none; border-top: 3px solid #0369A1; padding-top: 10px; margin-top: 6px; color: #0369A1; }

        .troco-box { background: #FFF7ED; border: 1px solid #FED7AA; border-radius: 6px; padding: 10px 14px; font-size: 12px; color: #9A3412; }

        .footer { margin-top: 30px; border-top: 1px solid #BFDBFE; padding-top: 12px; text-align: center; font-size: 10px; color: #93C5FD; }

        .print-btn { position: fixed; bottom: 20px; right: 20px; background: #0369A1; color: #fff; border: none; border-radius: 10px; padding: 12px 22px; font-weight: 700; cursor: pointer; font-size: 14px; box-shadow: 0 4px 16px rgba(3,105,161,0.3); }
        .print-btn:hover { background: #0284C7; }

        @media print {
          @page { size: A4; margin: 0; }
          .page { padding: 14mm 13mm; }
          .print-btn { display: none; }
        }
      `}</style>

      <div className="page">

        {/* Header */}
        <div className="header">
          <img src="/logo.png" alt="Madame Simone" className="logo-img" />
          <div className="bon-info">
            <div className="badge">🏪 Revenda B2B</div>
            <h2>Bon de Commande</h2>
            <p>N° {shortId}</p>
            <p>{formatDate(order.created_at)}</p>
          </div>
        </div>

        {/* Client info */}
        <div className="section">
          <div className="section-title">Dados do Estabelecimento</div>
          <div className="info-grid">
            <div className="info-row">
              <span className="info-label">Estabelecimento</span>
              <span className="info-value">{order.establishment_name || order.customer_name}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Telefone (WhatsApp)</span>
              <span className="info-value">{order.customer_phone_e164}</span>
            </div>
            {order.customer_email && (
              <div className="info-row">
                <span className="info-label">Email</span>
                <span className="info-value">{order.customer_email}</span>
              </div>
            )}
            <div className="info-row" style={{ gridColumn: '1 / -1' }}>
              <span className="info-label">Endereço de entrega</span>
              <span className="info-value">
                {order.address_street}, {order.address_number} — {order.address_postal_code} {order.address_city}, Bélgica
              </span>
            </div>
          </div>
        </div>

        {/* Troco */}
        {order.needs_change && (
          <div className="section">
            <div className="section-title">Troco</div>
            <div className="troco-box">
              Cliente tem <strong>{formatEUR(temMaos)}</strong> em mãos — Levar <strong>{formatEUR(troco)}</strong> de troco
            </div>
          </div>
        )}

        {/* Items */}
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
          Madame Simone — Produits Alimentaires · Pedido B2B #{shortId} · {formatDate(order.created_at)}
        </div>
      </div>

      <button className="print-btn" onClick={() => window.print()}>
        🖨️ Imprimir / Salvar PDF
      </button>
    </>
  );
}
