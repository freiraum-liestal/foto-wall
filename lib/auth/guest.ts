'use client';

import { createClient } from '@/lib/supabase/client';
import type { GuestRow } from '@/lib/supabase/types';
import { guestNameSchema, firstZodMessage } from '@/lib/validation/schemas';

/**
 * Gast-Onboarding: anonyme Anmeldung + eigene Guest-Zeile für GENAU
 * dieses Event. Wird von der Namenseingabe-Seite unter /e/[slug] aufgerufen.
 *
 * Wichtig: name wird hier per Zod validiert (sofortiges Feedback), aber
 * der eigentliche Sicherheitsanker bleibt der CHECK-Constraint auf
 * guests.name (1-50 Zeichen) sowie RLS (guests_insert_own) - Zod ersetzt
 * das nicht, es nimmt nur unnötige Round-Trips vorweg.
 */
export async function joinEventAsGuest(
  eventId: string,
  name: string,
  discoverable = true
): Promise<GuestRow> {
  const parsed = guestNameSchema.safeParse(name);
  if (!parsed.success) {
    throw new Error(firstZodMessage(parsed.error));
  }
  const trimmedName = parsed.data;

  const supabase = createClient();

  const { data: sessionData } = await supabase.auth.getSession();
  let userId = sessionData.session?.user?.id;

  if (!userId) {
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
    if (authError) throw authError;
    userId = authData.user?.id;
  }

  if (!userId) {
    throw new Error('Anmeldung fehlgeschlagen (keine User-ID erhalten).');
  }

  const { data: guest, error: guestError } = await supabase
    .from('guests')
    .upsert(
      {
        event_id: eventId,
        user_id: userId,
        name: trimmedName,
        discoverable,
      },
      { onConflict: 'event_id,user_id' }
    )
    .select()
    .single();

  if (guestError) throw guestError;
  return guest;
}

/**
 * Der Beamer/Projector läuft unbeaufsichtigt (kein Mensch tippt einen
 * Namen ein), braucht aber trotzdem eine Guest-Identität, damit die
 * bestehenden RLS-Policies (is_active_guest_of) ihn wie jeden anderen
 * Zuschauer behandeln - keine Sonderregel in der DB nötig.
 * discoverable=false, damit "Beamer" nicht in der Gästeliste auftaucht.
 */
export async function joinEventAsBeamer(eventId: string): Promise<GuestRow> {
  return joinEventAsGuest(eventId, 'Beamer', false);
}

/**
 * Bestehende Guest-Session für ein Event laden (z.B. beim erneuten
 * Öffnen der App). Gibt null zurück, wenn (noch) kein Guest-Profil
 * für dieses Event existiert oder keine Session aktiv ist.
 */
export async function getGuestForEvent(eventId: string): Promise<GuestRow | null> {
  const supabase = createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('getGuestForEvent: Fehler beim Laden', error.message);
    return null;
  }
  return data;
}
