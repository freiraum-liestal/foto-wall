'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Images, X, Send, Loader2, Video as VideoIcon } from 'lucide-react';
import { toast } from 'sonner';
import { optimizeImage } from '@/lib/media/optimize';
import { uploadEventMedia } from '@/lib/media/upload';
import { isVideoFile, validateAndInspectVideo } from '@/lib/media/video';
import { createPost } from '@/lib/posts/api';
import { MEDIA_CONFIG } from '@/lib/config';
import { getErrorMessage } from '@/lib/utils/errors';

export function UploadForm({
  eventId,
  guestId,
  authorName,
  moderationEnabled,
  videoUploadEnabled = false,
  onPosted,
}: {
  eventId: string;
  guestId: string;
  authorName: string;
  moderationEnabled: boolean;
  videoUploadEnabled?: boolean;
  onPosted?: () => void;
}) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [validating, setValidating] = useState(false);
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    if (!selected) return;

    if (isVideoFile(selected)) {
      if (!videoUploadEnabled) {
        toast.error('Video-Upload ist für dieses Event nicht aktiviert.');
        if (cameraInputRef.current) cameraInputRef.current.value = '';
        if (galleryInputRef.current) galleryInputRef.current.value = '';
        return;
      }
      setValidating(true);
      try {
        const meta = await validateAndInspectVideo(selected);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setFile(selected);
        setIsVideo(true);
        setVideoDuration(meta.duration);
        setPreviewUrl(URL.createObjectURL(selected));
      } catch (err) {
        toast.error(getErrorMessage(err, 'Ungültige Videodatei.'));
        if (cameraInputRef.current) cameraInputRef.current.value = '';
        if (galleryInputRef.current) galleryInputRef.current.value = '';
      } finally {
        setValidating(false);
      }
    } else {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(selected);
      setIsVideo(false);
      setVideoDuration(null);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  }

  function handleRemoveMedia() {
    setFile(null);
    setIsVideo(false);
    setVideoDuration(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUploading(true);
    try {
      let storagePath: string | null = null;
      let mediaType: 'photo' | 'video' | null = null;

      if (file) {
        if (isVideo) {
          // Keine Kompression für Videos – Originaldatei hochladen
          storagePath = await uploadEventMedia(eventId, guestId, file);
          mediaType = 'video';
        } else {
          // Clientseitige Bildoptimierung via Canvas
          const optimized = await optimizeImage(file);
          storagePath = await uploadEventMedia(eventId, guestId, optimized);
          mediaType = 'photo';
        }
      }

      await createPost({
        eventId,
        guestId,
        authorName,
        text: text.trim() || null,
        mediaType,
        storagePath,
        moderationEnabled,
      });

      toast.success(moderationEnabled ? 'Gesendet – wartet auf Freigabe.' : 'Gepostet! 🎉');
      handleRemoveMedia();
      setText('');
      onPosted?.();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Beitrag konnte nicht gesendet werden.'));
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
      {/* Zwei getrennte Inputs: accept-Attribut passt sich an (nur Fotos oder Fotos + Videos) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept={videoUploadEnabled ? 'image/*,video/*' : 'image/*'}
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept={videoUploadEnabled ? 'image/*,video/*' : 'image/*'}
        onChange={handleFileChange}
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {validating ? (
          <motion.div
            key="validating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 text-neutral-500"
          >
            <Loader2 size={24} className="animate-spin text-neutral-700" />
            <p className="text-xs font-medium">Prüfe Video (Länge &amp; Format) …</p>
          </motion.div>
        ) : previewUrl ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            className="relative overflow-hidden rounded-2xl bg-neutral-950 shadow-md"
          >
            {isVideo ? (
              <video
                src={previewUrl}
                controls
                playsInline
                className="max-h-64 w-full rounded-2xl object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Vorschau" className="max-h-64 w-full object-cover" />
            )}

            {isVideo && videoDuration !== null && videoDuration > 0 && (
              <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                <VideoIcon size={12} />
                <span>{Math.round(videoDuration)}s (max. 30s)</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleRemoveMedia}
              aria-label="Medienelement entfernen"
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/80"
            >
              <X size={16} />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="choice"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 gap-3"
          >
            <PickButton
              icon={Camera}
              label={videoUploadEnabled ? 'Foto / Video aufnehmen' : 'Foto aufnehmen'}
              onClick={() => cameraInputRef.current?.click()}
            />
            <PickButton
              icon={Images}
              label={videoUploadEnabled ? 'Aus Galerie' : 'Foto aus Galerie'}
              onClick={() => galleryInputRef.current?.click()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MEDIA_CONFIG.TEXT_MAX_LENGTH}
        placeholder="Was möchtest du teilen? (optional)"
        className="rounded-xl border border-neutral-200 p-3 text-sm shadow-sm focus:outline-none focus:ring-2"
        style={{ '--tw-ring-color': 'var(--event-button)' } as React.CSSProperties}
        rows={3}
      />

      {!moderationEnabled && (
        <p className="text-xs text-neutral-400">
          Moderation ist für dieses Event ausgeschaltet – dein Beitrag erscheint sofort.
        </p>
      )}

      <motion.button
        type="submit"
        disabled={uploading || validating}
        whileTap={{ scale: 0.98 }}
        className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
        style={{ backgroundColor: 'var(--event-button)' }}
      >
        {uploading ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Sende …
          </>
        ) : (
          <>
            <Send size={16} /> Beitrag absenden
          </>
        )}
      </motion.button>
    </form>
  );
}

function PickButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Camera;
  label: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-8 text-center transition-colors"
      style={{ borderColor: 'color-mix(in srgb, var(--event-button) 45%, transparent)' }}
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full"
        style={{ backgroundColor: 'color-mix(in srgb, var(--event-button) 15%, transparent)' }}
      >
        <Icon size={22} style={{ color: 'var(--event-button)' }} />
      </div>
      <p className="text-xs font-medium" style={{ color: 'var(--event-primary)' }}>
        {label}
      </p>
    </motion.button>
  );
}
