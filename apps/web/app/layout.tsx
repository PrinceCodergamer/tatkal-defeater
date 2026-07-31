import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { SiteChrome } from '@/components/site-chrome';
import { PageTransition } from '@/components/page-transition';

// Geist Sans — primary UI/display typeface (Vercel/Linear precision)
const geistSans = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-sans',
});

// Geist Mono — numbers, countdowns, PNR codes, technical data
const geistMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-mono',
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
    <html
      lang="en"
      suppressHydrationWarning
      className={`no-js ${geistSans.variable} ${geistMono.variable}`}
    >
      {/* Remove .no-js on hydration so reveal animations can run */}
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.classList.remove('no-js');`,
        }}
      />
      <body className="min-h-screen antialiased bg-background text-foreground font-sans">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Providers>
          <SiteChrome>
            <PageTransition>{children}</PageTransition>
          </SiteChrome>
        </Providers>
      </body>
    </html>
  );
}
