import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ZohoConnect - Full-Stack Zero-Waste Integration',
  description: 'Complete integration for HSOMNI9000, HotStack, CodeNest, and Zoho ecosystem',
  keywords: ['HSOMNI9000', 'HotStack', 'CodeNest', 'Zoho', 'Full-Stack', 'Zero-Waste'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
