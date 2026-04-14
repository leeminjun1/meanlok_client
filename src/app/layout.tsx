import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { Providers } from '@/app/providers';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
});

export const metadata: Metadata = {
  title: 'Mean록',
  description: 'Simple Notion-like workspace for docs and collaboration',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={geist.variable}>
      <body className="min-h-screen bg-neutral-50 text-neutral-800 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
