import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { ThemeProvider } from './components/themeProvider';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AetherLink',
  description: 'Find jobs. Apply instantly.',
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/favicons/favicon.ico', sizes: 'any' }],
    apple: [{ url: '/favicons/apple-touch-icon.png', sizes: '180x180' }],
    shortcut: [{ url: '/favicons/favicon.ico' }],
    other: [
      { rel: 'icon', type: 'image/png', sizes: '16x16', url: '/favicons/favicon-16x16.png' },
      { rel: 'icon', type: 'image/png', sizes: '32x32', url: '/favicons/favicon-32x32.png' },
      { rel: 'apple-touch-icon', sizes: '180x180', url: '/favicons/apple-touch-icon.png' },
      { rel: 'mask-icon', url: '/favicons/safari-pinned-tab.svg', color: '#6366f1' },
      { rel: 'manifest', url: '/favicons/site.webmanifest' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0b',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <ThemeProvider>{children}</ThemeProvider>
        {process.env.NODE_ENV === 'production' && <script src="/register-sw.js" defer />}
      </body>
    </html>
  );
}
