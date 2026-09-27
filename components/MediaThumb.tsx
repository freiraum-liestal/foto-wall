'use client';

import { useState, useRef } from 'react';
import { Play, Volume2, VolumeX, Video as VideoIcon } from 'lucide-react';
import type { MediaType } from '@/lib/supabase/types';

export interface MediaThumbProps {
  hasMedia: boolean;
  url: string | undefined;
  alt: string;
  mediaType?: MediaType | null;
  className: string;
  skeletonClassName?: string;
  mode?: 'thumbnail' | 'player' | 'swipe' | 'beamer-rotation' | 'beamer-grid-featured' | 'inline-preview';
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  onEnded?: () => void;
  onLoadedMetadata?: (e: React.SyntheticEvent<HTMLVideoElement, Event>) => void;
}

/**
 * Universelle Medienkomponente für Fotos und Videos.
 * Unterstützt optimierte Modi:
 * - 'thumbnail': Standbild/Poster mit Video-Icon (Live-Wall-Grid, Beamer-Kacheln)
 * - 'player': Voller Player mit nativen Steuerelementen (Detail-Modal)
 * - 'swipe': Autoplay lautlos mit Mute/Unmute-Toggle (Live-Wall-Swipe)
 * - 'beamer-rotation': Großbild-Autoplay (stumm) mit onEnded-Callback für Weiterschaltung
 * - 'beamer-grid-featured': Autoplay stumm im Loop für das hervorgehobene Beamer-Element
 * - 'inline-preview': Kompakter Player für Moderations-Queue
 */
export function MediaThumb({
  hasMedia,
  url,
  alt,
  mediaType = 'photo',
  className,
  skeletonClassName,
  mode = 'thumbnail',
  autoPlay = false,
  muted = true,
  loop = false,
  controls = false,
  onEnded,
  onLoadedMetadata,
}: MediaThumbProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!hasMedia) return null;

  if (!url) {
    return <div className={`animate-pulse bg-neutral-100 ${skeletonClassName ?? className}`} />;
  }

  const isVideo = mediaType === 'video';

  if (!isVideo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={alt} className={className} draggable={false} />
    );
  }

  // --- VIDEO MODI ---

  // 1. Thumbnail (z. B. LiveWallGrid oder kleine Beamer-Kacheln): Standbild + Video-Icon
  if (mode === 'thumbnail') {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <video
          src={`${url}#t=0.001`}
          preload="metadata"
          muted
          playsInline
          className="h-full w-full object-cover"
        />
        <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm shadow-sm">
          <Play size={11} className="fill-current ml-0.5" />
        </div>
      </div>
    );
  }

  // 2. Player (z. B. PostDetailModal): Voller Player mit Standard-Controls
  if (mode === 'player') {
    return (
      <div className="relative flex w-full items-center justify-center bg-black">
        <video
          src={url}
          controls
          playsInline
          autoPlay={autoPlay}
          className={className}
          onEnded={onEnded}
          onLoadedMetadata={onLoadedMetadata}
        />
      </div>
    );
  }

  // 3. Swipe-Ansicht: Stumm Autoplay mit Ton-Umschalter
  if (mode === 'swipe') {
    return (
      <div className="relative flex h-full w-full items-center justify-center">
        <video
          ref={videoRef}
          src={url}
          autoPlay
          muted={isMuted}
          loop
          playsInline
          className={className}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
        <div className="absolute right-4 top-4 z-20 flex gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (videoRef.current) {
                videoRef.current.muted = !isMuted;
                setIsMuted(!isMuted);
              }
            }}
            aria-label={isMuted ? 'Ton aktivieren' : 'Ton stummschalten'}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/80"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      </div>
    );
  }

  // 4. Beamer Rotation: Stumm Autoplay, feuert onEnded nach voller Videolänge
  if (mode === 'beamer-rotation') {
    return (
      <video
        src={url}
        autoPlay
        muted
        playsInline
        className={className}
        onEnded={onEnded}
        onLoadedMetadata={onLoadedMetadata}
      />
    );
  }

  // 5. Beamer Grid Featured: Stumm Autoplay im Loop
  if (mode === 'beamer-grid-featured') {
    return (
      <video
        src={url}
        autoPlay
        muted
        loop
        playsInline
        className={className}
      />
    );
  }

  // 6. Inline Preview (Moderation Queue): Kompakter Player mit Controls
  if (mode === 'inline-preview') {
    return (
      <div className={`relative overflow-hidden bg-black ${className}`}>
        <video
          src={url}
          controls
          muted
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  // Fallback
  return (
    <video
      src={url}
      controls={controls}
      autoPlay={autoPlay}
      muted={muted}
      loop={loop}
      playsInline
      className={className}
      onEnded={onEnded}
    />
  );
}
