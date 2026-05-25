import type { Metadata, Viewport } from 'next';
import '../styles/globals.css';
import { Providers } from '@/components/providers';
import { RegisterSW } from '@/components/pwa/RegisterSW';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { BottomTabBar } from '@/components/layout/BottomTabBar';

export const metadata: Metadata = {
  title: 'בר אברג׳יל · Hair Design — קביעת תור אונליין',
  description: 'בר אברג׳יל עיצוב שיער · בניין העיגולים, אילת. קבע תור אונליין תוך פחות מדקה.',
  applicationName: 'בר אברג׳יל',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'בר אברג׳יל',
  },
  formatDetection: { telephone: true },
  icons: {
    icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'בר אברג׳יל · Hair Design',
    description: 'מספרת בר אברג׳יל · בניין העיגולים, אילת',
    locale: 'he_IL',
    type: 'website',
    images: ['/logo.jpg'],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
          <BottomTabBar />
        </Providers>
        <RegisterSW />
        <InstallPrompt />
      </body>
    </html>
  );
}
