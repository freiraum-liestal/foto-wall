import { notFound } from 'next/navigation';
import { getEventBySlug } from '@/lib/events/queries';
import { createClient } from '@/lib/supabase/server';
import { AdminLoginGate } from './AdminLoginGate';
import { AdminNav } from './AdminNav';

/**
 * WICHTIG – bewusster Unterschied zur alten App:
 * Dieser Guard entscheidet NICHTS abschliessend selbst. Er zeigt nur die
 * passende UI (Login-Formular vs. Admin-Inhalt). Die tatsächliche
 * Autorisierung jeder Datenbank-Operation läuft über RLS
 * (public.is_event_admin), serverseitig, unabhängig von diesem Layout.
 * Wenn dieser Guard also einen Fehler hätte, könnte im schlimmsten Fall
 * jemand die Admin-UI-Hülle sehen – nie echte Daten fremder Events.
 */
export default async function EventAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <AdminLoginGate eventSlug={event.slug} />;
  }

  const { data: isAdmin, error } = await supabase.rpc('is_event_admin', {
    p_event_id: event.id,
  });

  // Fail closed: bei Fehler oder fehlender Berechtigung -> kein Zugriff.
  if (error || !isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-sm text-neutral-600">
          Du bist angemeldet, hast aber keine Admin-Rechte für dieses Event.
        </p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <AdminNav eventSlug={event.slug} />
      {children}
    </div>
  );
}
