'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApprovedPostsFeed } from '@/lib/posts/useApprovedPostsFeed';
import { MediaThumb } from '@/components/MediaThumb';
import { KindnessBadge } from '@/components/KindnessBadge';
import type { BeamerTransitionKey } from '@/lib/supabase/types';
import type { BeamerThemePreset } from '@/lib/theme/beamerThemes';

const DEFAULT_ROTATION_MS = 8000;

export function BeamerRotation({
  eventName,
  eventSlug,
  eventId,
  intervalMs,
  preset,
  transitionKey,
  activeIndex,
  onIndexChange,
}: {
  eventName: string;
  eventSlug: string;
  eventId: string;
  intervalMs: number;
  preset: BeamerThemePreset;
  transitionKey: BeamerTransitionKey;
  activeIndex?: number;
  onIndexChange?: (index: number) => void;
}) {
  const { posts, urls, loading, error } = useApprovedPostsFeed(eventId, 100);
  const [internalIndex, setInternalIndex] = useState(0);
  const [progressKey, setProgressKey] = useState(0);
  const isVideoPlayingRef = useRef(false);

  const index = activeIndex !== undefined ? activeIndex : internalIndex;
  const safeIndex = posts.length > 0 ? ((index % posts.length) + posts.length) % posts.length : 0;
  const post = posts[safeIndex];

  function nextSlide() {
    if (posts.length <= 1) return;
    const newIdx = (safeIndex + 1) % posts.length;
    if (onIndexChange) {
      onIndexChange(newIdx);
    } else {
      setInternalIndex(newIdx);
    }
    setProgressKey((k) => k + 1);
  }

  // Timer für Rotation (Fotos & Text)
  useEffect(() => {
    if (posts.length <= 1) return;

    if (post?.media_type === 'video') {
      isVideoPlayingRef.current = true;
      // Fallback-Timer falls Video onEnded nicht gefeuert wird (max 35s)
      const fallbackTimer = setTimeout(() => {
        nextSlide();
      }, 35000);
      return () => clearTimeout(fallbackTimer);
    }

    isVideoPlayingRef.current = false;
    const effectiveInterval = intervalMs || DEFAULT_ROTATION_MS;
    const timer = setTimeout(() => {
      nextSlide();
    }, effectiveInterval);

    return () => clearTimeout(timer);
  }, [posts.length, intervalMs, safeIndex, post?.media_type]);

  function handleVideoEnded() {
    if (posts.length > 1) {
      nextSlide();
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 rounded-3xl p-8 backdrop-blur-md"
          style={{
            background: preset.visuals.cardBg,
            border: preset.visuals.cardBorder,
            color: preset.visuals.textColor,
          }}
        >
          <div
            className="h-10 w-10 animate-spin rounded-full border-4 border-t-transparent"
            style={{ borderColor: `${preset.visuals.accentColor} transparent transparent transparent` }}
          />
          <p className="text-lg font-medium">Lade Beiträge …</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center p-6 text-center">
        <div
          className="rounded-3xl p-8 shadow-xl"
          style={{
            background: preset.visuals.cardBg,
            border: preset.visuals.cardBorder,
            color: preset.visuals.textColor,
          }}
        >
          <p className="text-lg font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex h-screen w-screen items-center justify-center text-center p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="flex max-w-2xl flex-col items-center gap-6 rounded-3xl p-12 shadow-2xl backdrop-blur-xl"
          style={{
            background: preset.visuals.cardBg,
            border: preset.visuals.cardBorder,
            boxShadow: preset.visuals.cardShadow,
          }}
        >
          <span className="text-4xl">📸✨</span>
          <h1
            className="text-4xl md:text-5xl font-bold tracking-tight"
            style={{
              color: preset.visuals.quoteColor,
              fontFamily: preset.visuals.fontHeadline === 'serif' ? 'Fraunces, Georgia, serif' : 'inherit',
            }}
          >
            {eventName}
          </h1>
          <p className="text-xl opacity-80" style={{ color: preset.visuals.textColor }}>
            Sei der Erste! Teile jetzt Fotos &amp; Videos unter:
          </p>
          <div
            className="rounded-2xl px-6 py-3 font-mono text-xl font-bold tracking-wider shadow-inner"
            style={{
              background: preset.visuals.badgeBg,
              color: preset.visuals.authorColor,
              border: preset.visuals.cardBorder,
            }}
          >
            /e/{eventSlug}
          </div>
        </motion.div>
      </div>
    );
  }

  const imageUrl = post.storage_path ? urls[post.storage_path] : undefined;
  const isVideo = post.media_type === 'video';
  const effectiveIntervalSec = Math.max(3, Math.round((intervalMs || DEFAULT_ROTATION_MS) / 1000));

  // Animation variants passend zum gewählten Übergangsstil
  const transitionVariants = {
    'ambient-glow': {
      initial: { opacity: 0, scale: 0.95, y: 15 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 1.03, y: -15 },
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
    },
    'ken-burns': {
      initial: { opacity: 0, scale: 0.98 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 1.06 },
      transition: { duration: 1.0, ease: 'easeOut' as const },
    },
    'slide-fade': {
      initial: { opacity: 0, x: 80, scale: 0.96 },
      animate: { opacity: 1, x: 0, scale: 1 },
      exit: { opacity: 0, x: -80, scale: 0.96 },
      transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
    },
  }[transitionKey];

  return (
    <div className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden p-6 md:p-12">
      {/* 1. Dynamischer Ambient-Glow Hintergrund */}
      {imageUrl && (
        <AnimatePresence mode="popLayout">
          <motion.div
            key={`ambient-${post.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: preset.isDark ? 0.45 : 0.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover blur-3xl saturate-150 scale-125 transform-gpu"
            />
            <div
              className="absolute inset-0"
              style={{
                background: preset.isDark
                  ? 'radial-gradient(circle at center, rgba(9,9,11,0.4) 0%, rgba(9,9,11,0.92) 100%)'
                  : 'radial-gradient(circle at center, rgba(246,244,236,0.3) 0%, rgba(246,244,236,0.85) 100%)',
              }}
            />
          </motion.div>
        </AnimatePresence>
      )}

      {/* 2. Hauptinhalt mit animiertem Übergang */}
      <AnimatePresence mode="wait">
        <motion.div
          key={post.id}
          initial={transitionVariants.initial}
          animate={transitionVariants.animate}
          exit={transitionVariants.exit}
          transition={transitionVariants.transition}
          className="relative z-10 flex max-h-[88vh] max-w-6xl flex-col items-center justify-center text-center"
        >
          {/* Medien-Container (Foto / Video) */}
          {post.storage_path ? (
            <div
              className="relative overflow-hidden rounded-3xl shadow-2xl backdrop-blur-sm"
              style={{
                border: preset.visuals.cardBorder,
                boxShadow: preset.visuals.cardShadow,
              }}
            >
              <div
                className={`overflow-hidden rounded-3xl ${
                  transitionKey === 'ken-burns' && !isVideo ? 'overflow-hidden' : ''
                }`}
              >
                <motion.div
                  animate={
                    transitionKey === 'ken-burns' && !isVideo
                      ? { scale: [1, 1.07] }
                      : { scale: 1 }
                  }
                  transition={{
                    duration: effectiveIntervalSec,
                    ease: 'linear',
                  }}
                  className="h-full w-full"
                >
                  <MediaThumb
                    hasMedia={Boolean(post.storage_path)}
                    url={imageUrl}
                    alt={post.text ?? 'Beitrag'}
                    mediaType={post.media_type}
                    mode="beamer-rotation"
                    onEnded={handleVideoEnded}
                    className="max-h-[60vh] md:max-h-[64vh] max-w-[85vw] object-contain rounded-3xl"
                    skeletonClassName="h-[40vh] w-[60vw] rounded-3xl bg-black/10"
                  />
                </motion.div>
              </div>

              {/* Badges über dem Foto */}
              {post.kindness_question && (
                <div className="absolute top-4 left-4 z-10">
                  <KindnessBadge text={post.kindness_question} variant="beamer" />
                </div>
              )}
            </div>
          ) : (
            /* Reiner Textbeitrag - Elegant als Statement Card */
            <div
              className="relative max-w-3xl rounded-3xl p-10 md:p-14 shadow-2xl backdrop-blur-xl"
              style={{
                background: preset.visuals.cardBg,
                border: preset.visuals.cardBorder,
                boxShadow: preset.visuals.cardShadow,
              }}
            >
              {post.kindness_question && (
                <div className="mb-6 flex justify-center">
                  <KindnessBadge text={post.kindness_question} variant="beamer" />
                </div>
              )}
              <p
                className="text-3xl md:text-5xl font-medium leading-tight"
                style={{
                  color: preset.visuals.quoteColor,
                  fontFamily:
                    preset.visuals.fontHeadline === 'serif' ? 'Fraunces, Georgia, serif' : 'inherit',
                }}
              >
                &ldquo;{post.text}&rdquo;
              </p>
              <p
                className="mt-6 text-xl md:text-2xl font-semibold tracking-wide"
                style={{ color: preset.visuals.authorColor }}
              >
                — {post.author_name}
              </p>
            </div>
          )}

          {/* Text & Autor unter dem Foto */}
          {post.storage_path && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="mt-5 flex flex-col items-center gap-2 px-6"
            >
              {post.text && (
                <p
                  className="max-w-3xl text-2xl md:text-3xl font-medium italic drop-shadow-sm"
                  style={{
                    color: preset.visuals.quoteColor,
                    fontFamily:
                      preset.visuals.fontHeadline === 'serif' ? 'Fraunces, Georgia, serif' : 'inherit',
                  }}
                >
                  &ldquo;{post.text}&rdquo;
                </p>
              )}
              <div
                className="inline-flex items-center gap-2 rounded-full px-5 py-1.5 text-base md:text-lg font-semibold shadow-sm backdrop-blur-md"
                style={{
                  background: preset.visuals.badgeBg,
                  color: preset.visuals.authorColor,
                  border: preset.visuals.cardBorder,
                }}
              >
                <span>— {post.author_name}</span>
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* 3. Animierter Fortschrittsbalken am unteren Rand */}
      {!isVideo && (
        <div className="pointer-events-none absolute bottom-0 inset-x-0 h-1.5 bg-black/10 z-20">
          <motion.div
            key={`progress-${progressKey}-${safeIndex}`}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{
              duration: effectiveIntervalSec,
              ease: 'linear',
            }}
            className="h-full rounded-r-full"
            style={{ background: preset.visuals.progressBarColor }}
          />
        </div>
      )}
    </div>
  );
}
