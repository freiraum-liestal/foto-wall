import { MEDIA_CONFIG } from '@/lib/config';

/**
 * Optimiert ein Bild clientseitig über Canvas: begrenzt Auflösung,
 * komprimiert, entfernt dabei implizit EXIF-Daten (Re-Encoding schreibt
 * keine Metadaten mehr). Wirft bei ungültigem Input.
 */
export async function optimizeImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Nur Bilddateien sind erlaubt.');
  }

  const maxBytes = MEDIA_CONFIG.IMAGE_MAX_SIZE_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`Bild darf maximal ${MEDIA_CONFIG.IMAGE_MAX_SIZE_MB} MB gross sein.`);
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);

    let { width, height } = img;
    const { IMAGE_MAX_WIDTH: maxWidth, IMAGE_MAX_HEIGHT: maxHeight } = MEDIA_CONFIG;
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas wird nicht unterstützt.');
    ctx.drawImage(img, 0, 0, width, height);

    const supportsWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp');
    const mimeType = supportsWebP ? 'image/webp' : 'image/jpeg';

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, mimeType, MEDIA_CONFIG.IMAGE_QUALITY)
    );
    if (!blob) throw new Error('Bild konnte nicht optimiert werden.');
    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Bild konnte nicht geladen werden.'));
    img.src = src;
  });
}

export function extensionForBlob(blob: Blob): string {
  if (blob.type === 'image/webp') return 'webp';
  if (blob.type === 'image/jpeg' || blob.type === 'image/jpg') return 'jpg';
  if (blob.type === 'image/png') return 'png';
  if (blob.type === 'video/mp4') return 'mp4';
  if (blob.type === 'video/quicktime') return 'mov';
  if (blob.type === 'video/webm') return 'webm';
  if ('name' in blob && typeof (blob as File).name === 'string') {
    const ext = (blob as File).name.split('.').pop()?.toLowerCase();
    if (ext && ['mp4', 'mov', 'webm', 'jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      return ext === 'jpeg' ? 'jpg' : ext;
    }
  }
  return 'bin';
}
