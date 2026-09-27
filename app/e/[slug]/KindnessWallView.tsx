'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getActivePrompt } from '@/lib/kindnesswall/api';
import { useKindnessAnswers } from '@/lib/kindnesswall/useKindnessAnswers';
import { createPost } from '@/lib/posts/api';
import type { KindnessPromptRow } from '@/lib/supabase/types';
import { getErrorMessage } from '@/lib/utils/errors';

export function KindnessWallView({
  eventId,
  guestId,
  authorName,
  moderationEnabled,
}: {
  eventId: string;
  guestId: string;
  authorName: string;
  moderationEnabled: boolean;
}) {
  const [prompt, setPrompt] = useState<KindnessPromptRow | null>(null);
  const [loadingPrompt, setLoadingPrompt] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const { answers, loading: loadingAnswers } = useKindnessAnswers(eventId, prompt?.id ?? null);

  useEffect(() => {
    let active = true;
    getActivePrompt(eventId)
      .then((data) => {
        if (active) setPrompt(data);
      })
      .finally(() => {
        if (active) setLoadingPrompt(false);
      });
    return () => {
      active = false;
    };
  }, [eventId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt) return;
    setSending(true);
    try {
      await createPost({
        eventId,
        guestId,
        authorName,
        text,
        moderationEnabled,
        kindnessPromptId: prompt.id,
      });
      setText('');
      toast.success(moderationEnabled ? 'Gesendet – wartet auf Freigabe.' : 'Danke fürs Teilen 💛');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Antwort konnte nicht gesendet werden.'));
    } finally {
      setSending(false);
    }
  }

  if (loadingPrompt) {
    return <p className="p-4 text-sm text-neutral-400">Lade …</p>;
  }

  if (!prompt) {
    return (
      <p className="p-4 text-sm text-neutral-500">
        Gerade keine aktive Frage. Schau später nochmal vorbei 💛
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div
        className="rounded-xl p-4 text-center"
        style={{ backgroundColor: 'color-mix(in srgb, var(--event-button) 12%, transparent)' }}
      >
        <p className="text-xs uppercase tracking-wide text-neutral-500">Kindness Wall</p>
        <p className="mt-1 text-lg font-medium" style={{ color: 'var(--event-primary)' }}>
          {prompt.question}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={220}
          rows={2}
          placeholder="Deine Antwort …"
          className="rounded-lg border border-neutral-300 p-2 text-sm"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="self-end rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: 'var(--event-button)' }}
        >
          Teilen
        </button>
      </form>

      {loadingAnswers ? (
        <p className="text-sm text-neutral-400">Lade Antworten …</p>
      ) : answers.length === 0 ? (
        <p className="text-sm text-neutral-500">Noch keine Antworten.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {answers.map((answer) => (
            <li key={answer.id} className="rounded-lg border border-neutral-200 p-3 text-sm">
              <p className="text-neutral-800">{answer.text}</p>
              <p className="mt-1 text-[10px] text-neutral-400">{answer.author_name}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
