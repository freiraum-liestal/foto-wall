import type { ReactNode } from 'react';
import type { EventTheme } from '@/lib/supabase/types';

/**
 * Server Component (kein "use client" nötig, da nur statisches Markup
 * erzeugt wird). Setzt die Theme-Werte des Events als CSS-Variablen auf
 * einem umschliessenden div. Alle Kindkomponenten benutzen ausschliesslich
 * diese Variablen (var(--event-primary) etc.), nie hart codierte Farben –
 * damit ändert der Admin die Primärfarbe einmal in event.theme, und es
 * wirkt überall (Punkt 11 der Spec: zentrales Theme-System).
 */
export function ThemeProvider({
  theme,
  children,
}: {
  theme: EventTheme;
  children: ReactNode;
}) {
  const style = {
    '--event-primary': theme.primary_color,
    '--event-secondary': theme.secondary_color,
    '--event-bg': theme.bg_color,
    '--event-text': theme.text_color,
    '--event-button': theme.button_color,
  } as React.CSSProperties;

  return (
    <div
      style={{ ...style, backgroundColor: 'var(--event-bg)', color: 'var(--event-text)' }}
      className="min-h-screen"
    >
      {children}
    </div>
  );
}
