'use client';

interface Props {
  orderId: string;
}

export default function SuccessScreen({ orderId }: Props) {
  const shortId = orderId.substring(0, 8).toUpperCase();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-ice-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="text-7xl mb-6 animate-bounce">🧊</div>
        <div className="card p-8">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Pedido enviado!</h1>
          <p className="text-gray-600 mb-6">
            Recebemos seu pedido e entraremos em contato pelo WhatsApp para confirmar a entrega.
          </p>

          <div className="bg-brand-50 rounded-2xl p-4 mb-6">
            <p className="text-sm text-brand-700 font-medium mb-1">Número do pedido</p>
            <p className="text-3xl font-mono font-bold text-brand-600">#{shortId}</p>
          </div>

          <p className="text-sm text-gray-500 mb-6">
            Guarde este número para acompanhar seu pedido. 📱
          </p>

          <button
            onClick={() => window.location.reload()}
            className="btn-secondary w-full"
          >
            Fazer novo pedido
          </button>
        </div>
      </div>
    </div>
  );
}
