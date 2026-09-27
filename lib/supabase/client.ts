import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase-Client für Client Components ("use client").
 * Nutzt Anon-Key – Sicherheit kommt ausschliesslich aus RLS, nicht aus
 * Geheimhaltung dieses Keys (der ist im Browser-Bundle ohnehin sichtbar).
 *
 * TODO: sobald `npx supabase gen types typescript` gegen das echte Projekt
 * gelaufen ist, hier <Database> aus den generierten Typen wieder einsetzen
 * für volle Query-Typsicherheit. lib/supabase/types.ts enthält bewusst nur
 * handgeschriebene Row-Typen für Rückgabewerte/Function-Signaturen, ist
 * aber (noch) nicht 1:1 kompatibel mit dem generischen Schema, das
 * @supabase/supabase-js für createClient<Database>() erwartet.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY fehlen. Siehe .env.local.example.'
    );
  }

  return createBrowserClient(url, anonKey);
}
