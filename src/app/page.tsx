import Image from 'next/image';

const URL_PEDIR = process.env.NEXT_PUBLIC_URL_PEDIR || '/pedir';
const URL_REVENDA = process.env.NEXT_PUBLIC_URL_REVENDA || '/revenda';

const SABORES_DESTAQUE = [
  'ABACATE', 'AÇAÍ', 'CHOCOTELLA', 'CÔCO',
  'MORANGO', 'NINHO COM OREO', 'PAÇOQUINHA', 'MARACUJÁ',
];

export default function LandingPage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: '#FAFAFA' }}>
      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #B91C1C 0%, #7C2D12 100%)' }}
      >
        <div className="max-w-6xl mx-auto px-6 py-16 sm:py-24 text-center text-white">
          <div className="flex justify-center mb-6">
            <Image
              src="/logo.png"
              alt="Madame Simone"
              width={120}
              height={120}
              priority
              className="rounded-full shadow-2xl"
            />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Madame Simone</h1>
          <p className="text-xl sm:text-2xl mb-2 font-light">
            Geladinho artesanal brasileiro
          </p>
          <p className="text-lg opacity-90 mb-10">
            Entregamos sabor e nostalgia direto na sua porta, na Bélgica 🇧🇪
          </p>
          <a
            href={URL_PEDIR}
            className="inline-block bg-white text-red-700 font-bold text-lg px-10 py-4 rounded-full shadow-xl hover:scale-105 transition-transform"
          >
            🍭 Fazer pedido agora
          </a>
          <p className="mt-4 text-sm opacity-75">A partir de € 1,70 • Mínimo 50 unidades</p>
        </div>
      </section>

      {/* Galeria de fotos (placeholders) */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-2 text-gray-800">
          Veja nossos sabores
        </h2>
        <p className="text-center text-gray-600 mb-10">30 sabores feitos com carinho</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div
              key={n}
              className="aspect-square bg-gradient-to-br from-pink-100 to-red-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-pink-300"
            >
              <span className="text-pink-400 text-sm">foto-{n}.jpg</span>
            </div>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
            Como funciona
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { emoji: '🍭', title: '1. Escolha', desc: 'Selecione seus sabores favoritos no cardápio' },
              { emoji: '📱', title: '2. Confirme', desc: 'Preencha seus dados e finalize o pedido' },
              { emoji: '🚚', title: '3. Receba', desc: 'Entregamos diretamente na sua casa' },
            ].map((s) => (
              <div key={s.title} className="text-center">
                <div className="text-6xl mb-4">{s.emoji}</div>
                <h3 className="text-xl font-bold mb-2 text-gray-800">{s.title}</h3>
                <p className="text-gray-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sabores em destaque */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-2 text-gray-800">
          Alguns dos nossos sabores
        </h2>
        <p className="text-center text-gray-600 mb-10">
          E muitos outros esperam você no cardápio completo
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {SABORES_DESTAQUE.map((s) => (
            <span
              key={s}
              className="px-4 py-2 bg-gradient-to-br from-red-50 to-pink-50 border border-red-100 rounded-full text-sm font-medium text-red-700"
            >
              {s}
            </span>
          ))}
        </div>
        <div className="text-center mt-10">
          <a
            href={URL_PEDIR}
            className="inline-block bg-red-700 text-white font-bold px-8 py-3 rounded-full shadow-lg hover:bg-red-800 transition-colors"
          >
            Ver cardápio completo →
          </a>
        </div>
      </section>

      {/* B2B section */}
      <section className="bg-gradient-to-br from-amber-50 to-orange-50 py-16 border-t-4 border-amber-400">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="text-5xl mb-4">🏪</div>
          <h2 className="text-3xl font-bold mb-4 text-gray-800">
            Tem um negócio? Vende para revendedores!
          </h2>
          <p className="text-lg text-gray-700 mb-8 max-w-2xl mx-auto">
            Restaurante, lanchonete, mercearia? Trabalhamos com revendedores em condições
            especiais. Geladinhos de qualidade, entrega regular e preço justo.
          </p>
          <a
            href={URL_REVENDA}
            className="inline-block bg-amber-600 text-white font-bold px-8 py-3 rounded-full shadow-lg hover:bg-amber-700 transition-colors"
          >
            Quero ser revendedor →
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo.png"
              alt="Madame Simone"
              width={60}
              height={60}
              className="rounded-full opacity-80"
            />
          </div>
          <p className="font-bold text-white mb-2">Madame Simone</p>
          <p className="text-sm mb-4">Geladinho artesanal • Bélgica</p>
          <p className="text-xs opacity-60">
            © {new Date().getFullYear()} Madame Simone — Todos os direitos reservados
          </p>
        </div>
      </footer>
    </main>
  );
}
