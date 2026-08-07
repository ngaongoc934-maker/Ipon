import type { Metadata } from 'next';
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google';
import { Toaster } from 'sonner';
import type { ReactNode } from 'react';
import { WalletProvider } from '@/ui/wallet/WalletProvider';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'opsz'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3003'),
  title: { default: 'Ipon — save with intention, on Stellar', template: '%s · Ipon' },
  description:
    'Ipon turns saving into something you can keep. Set a goal, deposit real XLM or USDC into your on-chain vault, and watch the ring fill — then withdraw on-chain when you hit it.',
  icons: { icon: '/icon.svg' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${fraunces.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <WalletProvider>
          {children}
          <Toaster richColors position="top-center" />
        </WalletProvider>
      </body>
    </html>
  );
}
