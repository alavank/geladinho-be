import type { Metadata, Viewport } from 'next';
import { PWARegisterQuick } from './pwa-register';

export const metadata: Metadata = {
  title: 'Registro Rápido — Madame Simone',
  description: 'Tire a foto da nota e salve o gasto na hora',
  manifest: '/manifest-quick.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Gastos Rápido',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#C41230',
};

export default function TakePhotoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <PWARegisterQuick />
    </>
  );
}
