'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useApprovedPostsFeed } from '@/lib/posts/useApprovedPostsFeed';
import { MediaThumb } from '@/components/MediaThumb';
import { KindnessBadge } from '@/components/KindnessBadge';
import type { PostRow } from '@/lib/supabase/types';
import type { BeamerThemePreset } from '@/lib/theme/beamerThemes';

const CLICK_PAUSE_MS = 15000;
const MAX_TILES = 9; // 1 grosses (2x2) + 8 kleine Kacheln in einem 4x3-Raster

export function BeamerGrid({
  eventId,
  intervalMs,
  preset,
}: {
  eventId: string;
  intervalMs: number;
  preset?: BeamerThemePreset;
}) {
  const { posts, urls, loading, error } = useApprovedPostsFeed(eventId, 60);

  // Nur Beiträge mit Medien (Foto oder Video)
  const mediaPosts = posts.filter((p) => p.storage_path).slice(0, MAX_TILES);

  const [featuredId, setFeaturedId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const effectiveFeaturedId =
    featuredId && mediaPosts.some((p) => p.id === featuredId)
      ? featuredId
      : (mediaPosts[0]?.id ?? null);

  useEffect(() => {
    if (paused || mediaPosts.length <= 1) return;
    const timer = setInterval(() => {
      setFeaturedId((current) => {
        const activeId =
          current && mediaPosts.some((p) => p.id === current) ? current : mediaPosts[0]?.id;
        const idx = mediaPosts.findIndex((p) => p.id === activeId);
        const next = mediaPosts[(idx + 1) % mediaPosts.length];
        return next?.id ?? current;
      });
    }, intervalMs || 6000);
    return () => clearInterval(timer);
  }, [paused, mediaPosts, intervalMs]);

  function handleClickTile(postId: string) {
    setFeaturedId(postId);
    setPaused(true);
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    pauseTimeoutRef.current = setTimeout(() => {
      setPaused(false);
    }, CLICK_PAUSE_MS);
  }

  useEffect(() => {
    return () => {
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center text-center">
        <p className="text-lg font-medium opacity-60">Lade Fotowand …</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center text-center p-6">
        <p className="text-lg font-medium">{error}</p>
      </div>
    );
  }

  if (mediaPosts.length === 0) {
    return (
      <div className="flex h-screen w-screen items-center justify-center text-center p-6">
        <div
          className="rounded-3xl p-10 shadow-xl"
          style={{
            background: preset?.visuals.cardBg ?? 'rgba(255,255,255,0.9)',
            border: preset?.visuals.cardBorder,
          }}
        >
          <p className="text-xl font-medium">Noch keine Fotos oder Videos für die Wand vorhanden.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center p-8 md:p-12">
      <div className="grid h-full w-full max-w-[1650px] grid-flow-dense grid-cols-4 grid-rows-3 gap-4">
        {mediaPosts.map((post) => (
          <GridTile
            key={post.id}
            post={post}
            imageUrl={post.storage_path ? urls[post.storage_path] : undefined}
            featured={post.id === effectiveFeaturedId}
            preset={preset}
            onClick={() => handleClickTile(post.id)}
          />
        ))}
      </div>
    </div>
  );
}

function GridTile({
  post,
  imageUrl,
  featured,
  preset,
  onClick,
}: {
  post: PostRow;
  imageUrl?: string;
  featured: boolean;
  preset?: BeamerThemePreset;
  onClick: () => void;
}) {
  return (
    <motion.div
      layout
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      className={`relative cursor-pointer overflow-hidden rounded-3xl shadow-xl transition-shadow ${
        featured ? 'col-span-2 row-span-2 z-10' : 'col-span-1 row-span-1 hover:brightness-105'
      }`}
      style={{
        border: featured && preset ? preset.visuals.cardBorder : '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: featured && preset ? preset.visuals.cardShadow : undefined,
      }}
    >
      <MediaThumb
        hasMedia
        url={imageUrl}
        alt={post.text ?? 'Beitrag'}
        mediaType={post.media_type}
        mode={featured ? 'beamer-grid-featured' : 'thumbnail'}
        className="h-full w-full object-cover"
        skeletonClassName="h-full w-full bg-black/10"
      />
      {featured && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-6 pt-14 text-white"
        >
          {post.kindness_question && (
            <div className="mb-2">
              <KindnessBadge text={post.kindness_question} variant="swipe" />
            </div>
          )}
          {post.text && (
            <p className="text-xl md:text-2xl font-medium italic">&ldquo;{post.text}&rdquo;</p>
          )}
          <p className="mt-2 text-sm md:text-base font-semibold text-white/90">
            — {post.author_name}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
