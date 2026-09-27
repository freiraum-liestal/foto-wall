'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';
import { useApprovedPostsFeed } from '@/lib/posts/useApprovedPostsFeed';
import { useReactions } from '@/lib/reactions/useReactions';
import { PostDetailModal } from './PostDetailModal';
import { MediaThumb } from '@/components/MediaThumb';
import { KindnessBadge } from '@/components/KindnessBadge';

const SLIDESHOW_INTERVAL_MS = 5000;
const SWIPE_THRESHOLD = 80;

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -60 : 60, opacity: 0 }),
};

export function LiveWallSwipe({
  eventId,
  guestId,
  authorName,
  moderationEnabled,
  autoAdvance,
}: {
  eventId: string;
  guestId: string;
  authorName: string;
  moderationEnabled: boolean;
  autoAdvance: boolean;
}) {
  const { posts, urls, loading, error } = useApprovedPostsFeed(eventId);
  const reactions = useReactions(
    eventId,
    posts.map((p) => p.id),
    guestId
  );
  const [[index, direction], setIndexState] = useState<[number, number]>([0, 0]);
  const [openComments, setOpenComments] = useState(false);

  const safeIndex = posts.length > 0 ? ((index % posts.length) + posts.length) % posts.length : 0;
  const post = posts[safeIndex];

  function goTo(newIndex: number, dir: number) {
    setIndexState([newIndex, dir]);
  }

  // Auto-Vorschub nur im Slideshow-Modus, und nur solange kein Detail-
  // Modal offen ist (sonst würde das Lesen von Kommentaren unterbrochen).
  useEffect(() => {
    if (!autoAdvance || openComments || posts.length <= 1) return;
    const timer = setInterval(() => goTo(safeIndex + 1, 1), SLIDESHOW_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [autoAdvance, openComments, safeIndex, posts.length]);

  if (loading) return <p className="p-4 text-sm text-neutral-400">Lade Live Wall …</p>;
  if (error) return <p className="p-4 text-sm text-red-600">{error}</p>;
  if (posts.length === 0) {
    return (
      <p className="p-4 text-sm text-neutral-500">
        Noch keine Beiträge. Sei der/die Erste! 📸
      </p>
    );
  }

  const imageUrl = post.storage_path ? urls[post.storage_path] : undefined;

  return (
    <div className="relative flex h-full w-full flex-col bg-neutral-950">
      <div className="z-10 flex items-center justify-center gap-2 p-3">
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
          {safeIndex + 1} / {posts.length}
        </span>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={post.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: 'easeOut' }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={(_e, info) => {
              if (info.offset.x < -SWIPE_THRESHOLD) goTo(safeIndex + 1, 1);
              else if (info.offset.x > SWIPE_THRESHOLD) goTo(safeIndex - 1, -1);
            }}
            onClick={() => setOpenComments(true)}
            className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center p-4"
          >
            {post.storage_path && (
              <MediaThumb
                hasMedia
                url={imageUrl}
                alt={post.text ?? 'Beitrag'}
                mediaType={post.media_type}
                mode="swipe"
                className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
                skeletonClassName="h-2/3 w-4/5 rounded-2xl bg-white/10"
              />
            )}

            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-5 pt-16">
              {post.kindness_question && (
                <div className="mb-1.5">
                  <KindnessBadge text={post.kindness_question} variant="swipe" />
                </div>
              )}
              {post.text && <p className="text-base italic text-white">&ldquo;{post.text}&rdquo;</p>}
              <div className="mt-1.5 flex items-center justify-between">
                <p className="text-sm font-semibold text-white">{post.author_name}</p>
                <span className="flex items-center gap-1 text-xs text-white/70">
                  <MessageCircle size={13} /> Details
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Für Maus-/Tastatur-Nutzer zusätzlich zum Wischen - dezent, blockiert den Swipe-Bereich nicht */}
        <button
          aria-label="Vorheriger Beitrag"
          onClick={() => goTo(safeIndex - 1, -1)}
          className="absolute left-1 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white/70 sm:block"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          aria-label="Nächster Beitrag"
          onClick={() => goTo(safeIndex + 1, 1)}
          className="absolute right-1 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white/70 sm:block"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <AnimatePresence>
        {openComments && (
          <PostDetailModal
            post={post}
            imageUrl={imageUrl}
            eventId={eventId}
            guestId={guestId}
            authorName={authorName}
            moderationEnabled={moderationEnabled}
            counts={reactions.countsByPost[post.id] ?? {}}
            mine={reactions.mineByPost[post.id] ?? new Set()}
            onToggleReaction={(reaction) => reactions.toggle(post.id, reaction)}
            onClose={() => setOpenComments(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
