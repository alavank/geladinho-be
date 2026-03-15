import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Madame Simone — Geladinho',
  description: 'Peça seus geladinhos favoritos com entrega na Bélgica!',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen" style={{ backgroundColor: '#FAFAFA' }}>
        {children}
      </body>
    </html>
  );
}
