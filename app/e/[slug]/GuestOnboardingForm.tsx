'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { joinEventAsGuest } from '@/lib/auth/guest';
import type { GuestRow } from '@/lib/supabase/types';
import { getErrorMessage } from '@/lib/utils/errors';

/**
 * Reine Formular-Komponente. Session-Check (ob schon ein Guest existiert)
 * passiert eine Ebene höher in EventApp.tsx, damit beim Umschalten
 * zwischen Onboarding und Live Wall nicht doppelt geladen wird.
 */
export function GuestOnboardingForm({
  eventId,
  onJoined,
}: {
  eventId: string;
  onJoined: (guest: GuestRow) => void;
}) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const guest = await joinEventAsGuest(eventId, name);
      onJoined(guest);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Etwas ist schiefgelaufen.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="text-sm font-medium text-neutral-700">
        Wie dürfen wir dich nennen?
      </label>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={50}
        required
        autoFocus
        className="rounded-xl border border-neutral-200 px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2"
        style={{ '--tw-ring-color': 'var(--event-button)' } as React.CSSProperties}
        placeholder="Dein Name"
      />
      <motion.button
        type="submit"
        disabled={loading}
        whileTap={{ scale: 0.98 }}
        className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
        style={{ backgroundColor: 'var(--event-button)' }}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <>
            Los geht&apos;s <ArrowRight size={16} />
          </>
        )}
      </motion.button>
    </form>
  );
}
