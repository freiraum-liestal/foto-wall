/**
 * Robuste Fehlermeldungs-Extraktion. NICHT nur auf `err instanceof Error`
 * verlassen: je nach installierter @supabase/*-Version sind PostgrestError/
 * AuthError/StorageError mal echte Error-Subklassen, mal reine Objekte mit
 * `message`-Feld - abhängig vom genauen Versionsstand, den `npm install`
 * gerade auflöst. Ein `instanceof`-Check allein kann daher lautlos auf den
 * Fallback-Text zurückfallen, obwohl eine aussagekräftige Meldung da wäre.
 *
 * Gleichzeitig immer den vollen Fehler in die Konsole loggen - Postgrest
 * selbst weist darauf hin, dass `hint`/`details`/`code` oft nützlicher sind
 * als `message` allein (z.B. bei RLS-Verweigerungen).
 */
export function getErrorMessage(err: unknown, fallback = 'Etwas ist schiefgelaufen.'): string {
  console.error('Error details:', err);

  if (err instanceof Error && err.message) return err.message;

  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    if (typeof e.message === 'string' && e.message) return e.message;
    if (typeof e.error_description === 'string' && e.error_description) return e.error_description;
    if (typeof e.details === 'string' && e.details) return e.details;
    if (typeof e.hint === 'string' && e.hint) return e.hint;
    if (typeof e.error === 'string' && e.error) return e.error;
  }

  if (typeof err === 'string' && err) return err;

  return fallback;
}
