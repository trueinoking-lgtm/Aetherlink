import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans, JetBrains_Mono, Syne } from 'next/font/google';

import { ThemeProvider } from './components/themeProvider';
import './globals.css';

const syne = Syne({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['700', '800'],
});

const ibmPlex = IBM_Plex_Sans({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '500'],
});

const jetbrains = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400'],
});

export const metadata: Metadata = {
  title: 'AetherLink',
  description: 'Find jobs. Apply instantly.',
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icon-192.png', sizes: '192x192' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#F5A623',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${syne.variable} ${ibmPlex.variable} ${jetbrains.variable} min-h-screen antialiased`}
        style={{ fontFamily: 'var(--font-body), sans-serif' }}
      >
        <ThemeProvider>{children}</ThemeProvider>
        {process.env.NODE_ENV === 'production' && <script src="/register-sw.js" defer />}
      </body>
    </html>
  );
}
