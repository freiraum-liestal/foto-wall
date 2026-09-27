'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Users, ImageIcon, Clock, Plus, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { getMyEvents, createEvent, slugify } from '@/lib/events/admin';
import { getEventStats, type EventStats } from '@/lib/events/stats';
import type { EventRow } from '@/lib/supabase/types';
import { getErrorMessage } from '@/lib/utils/errors';

export function EventDashboard() {
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [stats, setStats] = useState<Record<string, EventStats>>({});

  useEffect(() => {
    let active = true;
    getMyEvents()
      .then((data) => {
        if (!active) return;
        setEvents(data);
        data.forEach((event) => {
          getEventStats(event.id).then((s) => {
            if (active) setStats((current) => ({ ...current, [event.id]: s }));
          });
        });
      })
      .catch((err) => {
        if (active) toast.error(getErrorMessage(err, 'Events konnten nicht geladen werden.'));
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-xl font-semibold text-neutral-900">Deine Events</h1>

      {events === null ? (
        <div className="mb-8 flex flex-col gap-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-neutral-100" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="mb-6 text-sm text-neutral-500">Noch keine Events. Leg dein erstes an:</p>
      ) : (
        <ul className="mb-8 flex flex-col gap-3">
          {events.map((event, i) => (
            <EventCard key={event.id} event={event} stats={stats[event.id]} index={i} />
          ))}
        </ul>
      )}

      <CreateEventForm
        onCreated={(event) => setEvents((current) => [event, ...(current ?? [])])}
      />
    </main>
  );
}

function EventCard({ event, stats, index }: { event: EventRow; stats?: EventStats; index: number }) {
  const pendingTotal = (stats?.pendingPostCount ?? 0) + (stats?.pendingCommentCount ?? 0);

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
    >
      <a
        href={`/e/${event.slug}/admin/settings`}
        className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 p-4 shadow-sm transition hover:border-neutral-300 hover:shadow-md"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-neutral-900">{event.name}</span>
            <StatusPill status={event.status} />
          </div>
          <div className="mt-2 flex items-center gap-4 text-xs text-neutral-500">
            <span className="flex items-center gap-1">
              <Users size={13} /> {stats?.guestCount ?? '–'}
            </span>
            <span className="flex items-center gap-1">
              <ImageIcon size={13} /> {stats?.photoCount ?? '–'}
            </span>
            {pendingTotal > 0 && (
              <span className="flex items-center gap-1 font-medium text-amber-600">
                <Clock size={13} /> {pendingTotal} offen
              </span>
            )}
          </div>
        </div>
        <ChevronRight size={18} className="flex-shrink-0 text-neutral-300" />
      </a>
    </motion.li>
  );
}

function StatusPill({ status }: { status: EventRow['status'] }) {
  const styles: Record<EventRow['status'], string> = {
    active: 'bg-green-100 text-green-700',
    draft: 'bg-neutral-100 text-neutral-500',
    archived: 'bg-neutral-100 text-neutral-400',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${styles[status]}`}>
      {status}
    </span>
  );
}

function CreateEventForm({ onCreated }: { onCreated: (event: EventRow) => void }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const event = await createEvent(slug, name);
      onCreated(event);
      toast.success('Event angelegt.');
      router.push(`/e/${event.slug}/admin/settings`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Event konnte nicht erstellt werden.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-dashed border-neutral-300 p-4"
    >
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-700">
        <Plus size={15} /> Neues Event anlegen
      </h2>
      <label className="text-xs font-medium text-neutral-600">Name</label>
      <input
        value={name}
        onChange={(e) => handleNameChange(e.target.value)}
        required
        placeholder="z.B. Hochzeit Anna & Marco"
        className="rounded-xl border border-neutral-200 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
      />
      <label className="text-xs font-medium text-neutral-600">
        URL-Slug (aus dem Namen abgeleitet, editierbar)
      </label>
      <input
        value={slug}
        onChange={(e) => {
          setSlugTouched(true);
          setSlug(slugify(e.target.value));
        }}
        required
        pattern="[a-z0-9]+(-[a-z0-9]+)*"
        className="rounded-xl border border-neutral-200 px-3 py-2 font-mono text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
      />
      {slug && <p className="text-xs text-neutral-400">/e/{slug}</p>}
      <motion.button
        type="submit"
        disabled={loading || !slug || !name}
        whileTap={{ scale: 0.98 }}
        className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
      >
        {loading ? 'Lege an …' : 'Event anlegen'}
      </motion.button>
    </form>
  );
}
