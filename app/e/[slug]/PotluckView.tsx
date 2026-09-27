'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { usePotluckItems } from '@/lib/potluck/usePotluckItems';
import { createPotluckItem, deleteOwnPotluckItem } from '@/lib/potluck/api';
import { POTLUCK_CATEGORIES, type PotluckCategory } from '@/lib/supabase/types';
import { getErrorMessage } from '@/lib/utils/errors';

export function PotluckView({
  eventId,
  guestId,
  authorName,
}: {
  eventId: string;
  guestId: string;
  authorName: string;
}) {
  const { items, loading, error } = usePotluckItems(eventId);
  const [category, setCategory] = useState<PotluckCategory>('main');
  const [itemText, setItemText] = useState('');
  const [quantity, setQuantity] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await createPotluckItem({ eventId, guestId, authorName, category, itemText, quantity });
      setItemText('');
      setQuantity('');
      toast.success('Eingetragen 🍲');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Eintrag fehlgeschlagen.'));
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(itemId: string) {
    try {
      await deleteOwnPotluckItem(itemId);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Löschen fehlgeschlagen.'));
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-3">
        <p className="text-sm font-semibold">Was bringst du mit?</p>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as PotluckCategory)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        >
          {POTLUCK_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          value={itemText}
          onChange={(e) => setItemText(e.target.value)}
          maxLength={120}
          placeholder="z.B. Kartoffelsalat"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <input
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          maxLength={50}
          placeholder="Menge (optional, z.B. für 10 Personen)"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={sending || !itemText.trim()}
          className="self-end rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: 'var(--event-button)' }}
        >
          Eintragen
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-neutral-400">Lade …</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-neutral-500">Noch nichts eingetragen.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {POTLUCK_CATEGORIES.map(({ value, label }) => {
            const categoryItems = items.filter((i) => i.category === value);
            if (categoryItems.length === 0) return null;
            return (
              <div key={value}>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {label}
                </p>
                <ul className="flex flex-col gap-1.5">
                  {categoryItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                    >
                      <span>
                        {item.item_text}
                        {item.quantity && <span className="text-neutral-400"> · {item.quantity}</span>}
                        <span className="ml-2 text-[10px] text-neutral-400">{item.author_name}</span>
                      </span>
                      {item.author_id === guestId && (
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-xs text-neutral-400 hover:text-red-600"
                        >
                          Entfernen
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
