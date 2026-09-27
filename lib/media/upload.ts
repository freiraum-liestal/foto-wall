import { createClient } from '@/lib/supabase/client';
import { MEDIA_CONFIG } from '@/lib/config';
import { extensionForBlob } from './optimize';

/**
 * Wie uploadEventMedia, aber mit Fortschritts-Callback (0-100).
 * Das offizielle supabase-js SDK (storage.upload()) baut intern auf fetch()
 * auf und bietet dafür keine Upload-Progress-Events - deshalb hier bewusst
 * eine rohe XMLHttpRequest gegen den Storage-REST-Endpunkt, NUR um Zugriff
 * auf xhr.upload.onprogress zu bekommen. Pfad-Konvention, Auth-Header und
 * Content-Type entsprechen exakt uploadEventMedia() oben, damit dieselben
 * RLS-Storage-Policies greifen.
 */
export async function uploadEventMediaWithProgress(
  eventId: string,
  guestId: string,
  blob: Blob,
  onProgress?: (percent: number) => void
): Promise<string> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Keine aktive Sitzung – bitte Seite neu laden.');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY fehlen.');
  }

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

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      'POST',
      `${supabaseUrl}/storage/v1/object/${MEDIA_CONFIG.STORAGE_BUCKET}/${path}`
    );
    xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
    xhr.setRequestHeader('apikey', anonKey);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.setRequestHeader('cache-control', '3600');
    xhr.setRequestHeader('x-upsert', 'false');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload fehlgeschlagen (Status ${xhr.status}): ${xhr.responseText}`));
      }
    };
    xhr.onerror = () => reject(new Error('Netzwerkfehler beim Upload.'));
    xhr.send(blob);
  });

  return path;
}

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
