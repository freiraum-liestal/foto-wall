import { MEDIA_CONFIG } from '@/lib/config';

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
}

const ALLOWED_EXTENSIONS = ['mp4', 'mov', 'webm'];

export function isVideoFile(file: File): boolean {
  if (file.type.startsWith('video/')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ext ? ALLOWED_EXTENSIONS.includes(ext) : false;
}

/**
 * Validiert ein Video clientseitig BEVOR der Upload startet:
 * - Dateigrösse <= 50 MB
 * - Format: MP4, MOV (QuickTime), WebM
 * - Dauer per Video-Metadaten <= 30 Sekunden
 *
 * Gibt bei Erfolg die extrahierten Metadaten zurück oder wirft einen
 * präzisen Fehler für die Toast-Benachrichtigung.
 */
export async function validateAndInspectVideo(file: File): Promise<VideoMetadata> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  const isAllowedMime = file.type
    ? (MEDIA_CONFIG.ALLOWED_VIDEO_TYPES as readonly string[]).includes(file.type) || file.type.startsWith('video/')
    : false;
  const isAllowedExt = ext ? ALLOWED_EXTENSIONS.includes(ext) : false;

  if (!isAllowedMime && !isAllowedExt) {
    throw new Error('Nicht unterstütztes Videoformat. Erlaubt sind MP4, MOV und WebM.');
  }

  const maxBytes = MEDIA_CONFIG.VIDEO_MAX_SIZE_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(
      `Video ist zu gross (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximal ${MEDIA_CONFIG.VIDEO_MAX_SIZE_MB} MB erlaubt.`
    );
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const meta = await new Promise<VideoMetadata>((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Videodaten konnten nicht geladen werden. Bitte versuche ein anderes Format.'));
      }, 8000);

      function cleanup() {
        clearTimeout(timeout);
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('error', onError);
      }

      function onLoaded() {
        cleanup();
        const duration = video.duration;
        if (!Number.isFinite(duration) || duration <= 0) {
          // Einige Browser liefern duration erst nach kurzem Anspielen oder gar nicht
          resolve({ duration: 0, width: video.videoWidth || 0, height: video.videoHeight || 0 });
          return;
        }

        if (duration > MEDIA_CONFIG.VIDEO_MAX_DURATION_SECONDS + 0.5) {
          reject(
            new Error(
              `Video ist ${Math.round(duration)} Sekunden lang. Maximal ${MEDIA_CONFIG.VIDEO_MAX_DURATION_SECONDS} Sekunden erlaubt.`
            )
          );
          return;
        }

        resolve({
          duration,
          width: video.videoWidth || 0,
          height: video.videoHeight || 0,
        });
      }

      function onError() {
        cleanup();
        reject(new Error('Video konnte nicht gelesen werden. Bitte prüfe das Format (MP4, MOV, WebM).'));
      }

      video.addEventListener('loadedmetadata', onLoaded);
      video.addEventListener('error', onError);
      video.src = objectUrl;
    });

    return meta;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
