import { notFound } from 'next/navigation';
import { getEventBySlug } from '@/lib/events/queries';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  // WICHTIG: Dieses Layout umschliesst auch /admin und /beamer (Next.js
  // verschachtelt Layouts pfadbasiert). Ein harter `status !== 'active'`
  // Check hier würde Event-Admins aus ihrem eigenen Draft-Event aussperren
  // - genau dem Zustand, in dem sie es einrichten wollen.
  //
  // Stattdessen verlassen wir uns auf RLS: getEventBySlug() nutzt den
  // Server-Client mit der Session des Aufrufers. Für einen normalen Gast
  // liefert RLS ein Draft-Event gar nicht erst zurück (nur
  // events_read_active greift), für einen Admin schon (zusätzlich
  // events_read_own_admin). `!event` ist daher der einzige Check, der
  // hier korrekt für alle drei Routen (Gast/Admin/Beamer) funktioniert.
  // Die Gast- und Beamer-Seiten prüfen `status === 'active'` zusätzlich
  // selbst (siehe page.tsx), weil sie das für ihre eigene Logik explizit
  // brauchen - nicht weil es hier fehlen würde.
  if (!event) {
    notFound();
  }

  return <ThemeProvider theme={event.theme}>{children}</ThemeProvider>;
}
