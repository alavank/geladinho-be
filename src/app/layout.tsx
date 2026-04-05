import type { Metadata } from 'next';
import './globals.css';
import GoogleMapsLoader from '@/components/GoogleMapsLoader';

export const metadata: Metadata = {
  title: 'Madame Simone — Geladinho',
  description: 'Peça seus geladinhos favoritos com entrega na Bélgica!',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen" style={{ backgroundColor: '#FAFAFA' }}>
        <GoogleMapsLoader />
        {children}
      </body>
    </html>
  );
}
