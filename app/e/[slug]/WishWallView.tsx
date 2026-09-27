'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useWishWall } from '@/lib/wishwall/useWishWall';
import { createWish } from '@/lib/wishwall/api';
import { getErrorMessage } from '@/lib/utils/errors';

export function WishWallView({
  eventId,
  guestId,
  authorName,
}: {
  eventId: string;
  guestId: string;
  authorName: string;
}) {
  const { wishes, loading, error, toggleVote } = useWishWall(eventId, guestId);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await createWish(eventId, guestId, authorName, text);
      setText('');
      toast.success('Wunsch hinzugefügt 🎁');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Wunsch konnte nicht gesendet werden.'));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={220}
          placeholder="Musikwunsch, Idee, Feedback …"
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: 'var(--event-button)' }}
        >
          + Wunsch
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-neutral-400">Lade …</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : wishes.length === 0 ? (
        <p className="text-sm text-neutral-500">Noch keine Wünsche. Sei der/die Erste!</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {wishes.map((wish) => (
            <li
              key={wish.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 p-3"
            >
              <div>
                <p className="text-sm text-neutral-800">{wish.text}</p>
                <p className="text-[10px] text-neutral-400">{wish.author_name}</p>
              </div>
              <button
                onClick={() => toggleVote(wish.id)}
                className="flex flex-col items-center rounded-lg border px-3 py-1 text-sm"
                style={{
                  borderColor: wish.myVote ? 'var(--event-button)' : '#e2ddc9',
                  color: wish.myVote ? 'var(--event-button)' : 'inherit',
                }}
              >
                <span>▲</span>
                <span className="text-xs">{wish.voteCount}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
