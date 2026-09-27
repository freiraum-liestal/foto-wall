import { createClient } from '@/lib/supabase/client';
import { MEDIA_CONFIG } from '@/lib/config';
import { extensionForBlob } from './optimize';

/**
 * Lädt eine bereits optimierte Datei hoch. Der Pfad MUSS dem Muster
 * {event_id}/{guest_id}/{dateiname} folgen – die Storage-RLS-Policies
 * (siehe supabase/003_storage_policies.sql) prüfen genau diese Struktur.
 */
export async function uploadEventMedia(
  eventId: string,
  guestId: string,
  blob: Blob
): Promise<string> {
  const supabase = createClient();
  const ext = extensionForBlob(blob);
  const filename = `${crypto.randomUUID()}.${ext}`;
  const path = `${eventId}/${guestId}/${filename}`;

  const contentType =
    blob.type ||
    (ext === 'mp4'
      ? 'video/mp4'
      : ext === 'mov'
      ? 'video/quicktime'
      : ext === 'webm'
      ? 'video/webm'
      : ext === 'webp'
      ? 'image/webp'
      : ext === 'png'
      ? 'image/png'
      : 'image/jpeg');

  const { error } = await supabase.storage
    .from(MEDIA_CONFIG.STORAGE_BUCKET)
    .upload(path, blob, {
      cacheControl: '3600',
      upsert: false,
      contentType,
    });

  if (error) throw error;
  return path;
}

/**
 * Erzeugt signierte URLs für eine Menge von Storage-Pfaden in einem
 * einzigen Request. Nötig, weil der Bucket bewusst NICHT öffentlich ist
 * (siehe 003_storage_policies.sql) – RLS entscheidet pro Nutzer, welche
 * Pfade überhaupt signiert werden dürfen.
 */
export async function getSignedUrls(
  paths: string[],
  expiresInSeconds = 3600
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(MEDIA_CONFIG.STORAGE_BUCKET)
    .createSignedUrls(paths, expiresInSeconds);

  if (error) throw error;

  const map: Record<string, string> = {};
  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl) map[entry.path] = entry.signedUrl;
  }
  return map;
}

export async function getSignedUrl(path: string, expiresInSeconds = 3600): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(MEDIA_CONFIG.STORAGE_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  if (error) {
    console.warn('getSignedUrl failed', error.message);
    return null;
  }
  return data.signedUrl;
}
