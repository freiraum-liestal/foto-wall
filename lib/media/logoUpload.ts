import { createClient } from '@/lib/supabase/client';
import { optimizeImage, extensionForBlob } from './optimize';

const ASSETS_BUCKET = 'event-assets';

/**
 * Lädt ein Logo hoch und gibt die öffentliche URL zurück. Anders als
 * Gästefotos (privater Bucket, signierte URLs) liegt das hier in einem
 * öffentlichen Bucket - Logos sind keine sensiblen Daten und sollen ohne
 * Umweg überall anzeigbar sein (Beamer, später öffentliche Event-Seite).
 */
export async function uploadEventLogo(eventId: string, file: File): Promise<string> {
  const optimized = await optimizeImage(file);
  const supabase = createClient();
  const filename = `logo-${Date.now()}.${extensionForBlob(optimized)}`;
  const path = `${eventId}/_assets/${filename}`;

  const { error } = await supabase.storage.from(ASSETS_BUCKET).upload(path, optimized, {
    cacheControl: '3600',
    upsert: false,
    contentType: optimized.type,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(ASSETS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
