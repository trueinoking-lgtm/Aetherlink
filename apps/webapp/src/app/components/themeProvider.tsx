'use client';

import { ThemeProvider as LibThemeProvider } from '@aetherlink/ui/components/themeProvider';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <LibThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange>
      {children}
    </LibThemeProvider>
  );
}
