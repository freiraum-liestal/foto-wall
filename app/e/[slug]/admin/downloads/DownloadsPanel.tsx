'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getAllApprovedPostsForExport } from '@/lib/posts/admin';
import { getSignedDownloadUrl, downloadEventMediaAsZip, type ZipProgress } from '@/lib/media/download';
import { formatTimeAgo } from '@/lib/format/text';
import type { PostRow } from '@/lib/supabase/types';
import { getErrorMessage } from '@/lib/utils/errors';

export function DownloadsPanel({ eventId }: { eventId: string }) {
  const [posts, setPosts] = useState<PostRow[] | null>(null);
  const [zipping, setZipping] = useState(false);
  const [progress, setProgress] = useState<ZipProgress | null>(null);

  useEffect(() => {
    let active = true;
    getAllApprovedPostsForExport(eventId)
      .then((data) => {
        if (active) setPosts(data);
      })
      .catch((err) => {
        if (active) toast.error(getErrorMessage(err, 'Beiträge konnten nicht geladen werden.'));
      });
    return () => {
      active = false;
    };
  }, [eventId]);

  const mediaPosts = (posts ?? []).filter((p) => p.storage_path);

  async function handleDownloadAll() {
    if (!posts) return;
    setZipping(true);
    setProgress({ done: 0, total: mediaPosts.length });
    try {
      await downloadEventMediaAsZip(eventId, posts, setProgress);
      toast.success('ZIP heruntergeladen.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'ZIP-Export fehlgeschlagen.'));
    } finally {
      setZipping(false);
      setProgress(null);
    }
  }

  async function handleDownloadSingle(post: PostRow) {
    if (!post.storage_path) return;
    try {
      const extension = post.storage_path.split('.').pop() ?? 'jpg';
      const filename = `${post.author_name}-${post.id.slice(0, 8)}.${extension}`;
      const url = await getSignedDownloadUrl(post.storage_path, filename);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Download fehlgeschlagen.'));
    }
  }

  const progressPct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between card p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
            <ImageIcon size={18} />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900">{mediaPosts.length} Fotos &amp; Videos verfügbar</p>
            <p className="text-xs text-neutral-500">Nur freigegebene Beiträge mit Foto oder Video.</p>
          </div>
        </div>
        <motion.button
          onClick={handleDownloadAll}
          disabled={zipping || mediaPosts.length === 0}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
        >
          {zipping ? (
            <>
              <Loader2 size={14} className="animate-spin" /> {progressPct}%
            </>
          ) : (
            <>
              <Download size={14} /> Alle als ZIP
            </>
          )}
        </motion.button>
      </div>

      {posts === null ? (
        <div className="flex flex-col gap-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-neutral-100" />
          ))}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {mediaPosts.map((post) => (
            <li
              key={post.id}
              className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm shadow-sm"
            >
              <span className="text-neutral-700">
                {post.author_name} <span className="text-neutral-400">· {formatTimeAgo(post.created_at)}</span>
              </span>
              <button
                onClick={() => handleDownloadSingle(post)}
                className="flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-900"
              >
                <Download size={12} /> Herunterladen
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
