import { createClient } from '@/lib/supabase/server';
import type { EventRow } from '@/lib/supabase/types';

/**
 * Lädt ein Event über den Slug. Gibt null zurück, wenn es nicht existiert
 * oder RLS den Zugriff verweigert (z.B. draft-Event ohne Admin-Rechte) –
 * beide Fälle sollen für Gäste gleich aussehen (404), damit man aus dem
 * Fehlerverhalten keine Rückschlüsse auf die Existenz eines Events ziehen
 * kann.
 */
export async function getEventBySlug(slug: string): Promise<EventRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.warn('getEventBySlug: Fehler', error.message);
    return null;
  }
  return data;
}
