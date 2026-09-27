'use client';

import { createClient } from '@/lib/supabase/client';

/**
 * Event-Admins melden sich NIE anonym an (bewusster Unterschied zur alten
 * App). Magic-Link ist die einfachste MVP-Lösung ohne Passwort-Handling.
 */
export async function sendAdminMagicLink(email: string, redirectPath: string) {
  const supabase = createClient();
  const redirectTo = `${window.location.origin}/auth/callback?redirect_to=${encodeURIComponent(
    redirectPath
  )}`;

  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: redirectTo },
  });

  if (error) throw error;
}

/**
 * Prüft, ob der eingeloggte Nutzer Admin-Rechte für ein bestimmtes Event
 * hat. Ruft die serverseitige Funktion public.is_event_admin(event_id)
 * auf – das ist die EINZIGE Quelle der Wahrheit. Diese Funktion hier
 * entscheidet nur, was die UI anzeigt; sie autorisiert nichts selbst.
 */
export async function checkIsEventAdmin(eventId: string): Promise<boolean> {
  const supabase = createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return false;

  const { data, error } = await supabase.rpc('is_event_admin', { p_event_id: eventId });
  if (error) {
    console.warn('checkIsEventAdmin: RPC-Fehler', error.message);
    return false; // fail closed – bewusster Unterschied zur alten App
  }
  return Boolean(data);
}

export async function adminSignOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}
