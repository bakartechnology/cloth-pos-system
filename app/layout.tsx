import type { Metadata } from 'next';
import './globals.css';
import { AppProviders } from '@/components/providers/AppProviders';

export const metadata: Metadata = {
  title: 'AL-NOOR FABRICS | High-End Cloth Retail + Wholesale + Khata POS',
  description: 'Enterprise point-of-sale system for modern Pakistani textile, retail fashion, wholesale and customer khata ledger management.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
