import type { Metadata } from 'next';
import { Nunito_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

// Initialize Nunito Sans
const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  title: 'IRCTC Tatkal — Fair Train Booking Platform',
  description: 'Book train tickets with IRCTC\'s fair lottery system. No bots, no scalpers, equal chance for everyone.',
  keywords: ['irctc', 'tatkal', 'train booking', 'indian railways', 'fair booking', 'lottery'],
  openGraph: {
    title: 'IRCTC Tatkal — Fair Train Booking Platform',
    description: 'Fair lottery-based Tatkal booking for everyone. Beat the bots.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={nunitoSans.variable}>
      <body className="min-h-screen antialiased bg-surface-alt text-text font-sans">
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}