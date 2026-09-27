import JSZip from 'jszip';
import { createClient } from '@/lib/supabase/client';
import { MEDIA_CONFIG } from '@/lib/config';
import type { PostRow } from '@/lib/supabase/types';

/**
 * Einzeldatei-Download: signierte URL mit erzwungenem Download-Header.
 * Braucht KEINE Service-Role - der Admin liest sein eigenes Event, das
 * deckt die reguläre Storage-Policy (siehe Migration 006) bereits ab.
 */
export async function getSignedDownloadUrl(path: string, filename: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(MEDIA_CONFIG.STORAGE_BUCKET)
    .createSignedUrl(path, 60, { download: filename });
  if (error) throw error;
  return data.signedUrl;
}

export interface ZipProgress {
  done: number;
  total: number;
}

/**
 * Baut ein ZIP mit allen Fotos eines Events komplett im Browser -
 * bewusst OHNE Service-Role-Route. Alternative wäre eine serverseitige
 * ZIP-Route mit Service-Role (bypasst RLS für alle Guest-Ordner auf
 * einmal), aber das würde das zentrale Architekturprinzip ("RLS ist die
 * einzige Quelle der Wahrheit, niemand umgeht sie pauschal") ausgerechnet
 * für das Feature durchbrechen, das am wenigsten Eile hat. Der Admin darf
 * seine eigenen Event-Fotos ohnehin per RLS lesen (Migration 006) - das
 * reicht, um das komplett im Browser des Admins zu bauen.
 *
 * Bekannte Grenze fürs MVP: läuft synchron im Browser-Speicher. Bei sehr
 * vielen/grossen Dateien (deutlich über das, was ein Fest wie DTZFS mit
 * ~100-120 Gästen an Fotos produziert) sollte das durch einen
 * Hintergrund-Job ersetzt werden - das war schon im ursprünglichen
 * Anforderungsdokument als möglicher Punkt für später vorgesehen.
 */
export async function downloadEventMediaAsZip(
  eventId: string,
  posts: PostRow[],
  onProgress?: (progress: ZipProgress) => void
): Promise<void> {
  const supabase = createClient();
  const mediaPosts = posts.filter((p) => p.storage_path);
  if (mediaPosts.length === 0) {
    throw new Error('Keine Fotos oder Videos zum Herunterladen vorhanden.');
  }

  const paths = mediaPosts.map((p) => p.storage_path as string);
  const { data: signedUrls, error } = await supabase.storage
    .from(MEDIA_CONFIG.STORAGE_BUCKET)
    .createSignedUrls(paths, 300);
  if (error) throw error;

  const urlByPath = new Map(
    (signedUrls ?? []).filter((s) => s.path && s.signedUrl).map((s) => [s.path as string, s.signedUrl])
  );

  const zip = new JSZip();
  let done = 0;

  for (const post of mediaPosts) {
    const path = post.storage_path as string;
    const url = urlByPath.get(path);
    if (!url) continue;

    const response = await fetch(url);
    if (!response.ok) continue;
    const blob = await response.blob();

    const extension = path.split('.').pop() ?? 'jpg';
    const safeAuthor = post.author_name.replace(/[^a-z0-9]+/gi, '_').slice(0, 30) || 'gast';
    const timestamp = post.created_at.slice(0, 19).replace(/[:T]/g, '-');
    zip.file(`${timestamp}_${safeAuthor}.${extension}`, blob);

    done += 1;
    onProgress?.({ done, total: mediaPosts.length });
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  triggerBlobDownload(zipBlob, `event-${eventId}-medien.zip`);
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
