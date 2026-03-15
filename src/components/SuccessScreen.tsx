'use client';

import Image from 'next/image';

interface Props { orderId: string; }

export default function SuccessScreen({ orderId }: Props) {
  const shortId = orderId.substring(0, 8).toUpperCase();
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #FFF5F5 0%, #FDF6EC 100%)' }}>
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <Image src="/logo.png" alt="Madame Simone" width={220} height={80} className="mx-auto h-16 w-auto object-contain" />
        </div>
        <div className="card p-8 shadow-lg">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Pedido enviado!</h1>
          <p className="text-gray-600 mb-6">Recebemos seu pedido e entraremos em contato pelo WhatsApp para confirmar a entrega.</p>
          <div className="rounded-2xl p-4 mb-6" style={{ backgroundColor: '#FFF5F5', border: '1px solid #FFC2C8' }}>
            <p className="text-sm font-medium mb-1" style={{ color: '#C41230' }}>Número do pedido</p>
            <p className="text-3xl font-mono font-bold" style={{ color: '#C41230' }}>#{shortId}</p>
          </div>
          <p className="text-sm text-gray-500 mb-6">Guarde este número para acompanhar seu pedido. 📱</p>
          <button onClick={() => window.location.reload()} className="btn-secondary w-full">Fazer novo pedido</button>
        </div>
      </div>
    </div>
  );
}
