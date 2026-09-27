'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getGuestForEvent } from '@/lib/auth/guest';
import { getEnabledModules } from '@/lib/events/modules';
import { TabBar } from '@/components/TabBar';
import { GuestOnboardingForm } from './GuestOnboardingForm';
import { LiveWallGrid } from './LiveWallGrid';
import { LiveWallSwipe } from './LiveWallSwipe';
import { UploadForm } from './UploadForm';
import { WishWallView } from './WishWallView';
import { KindnessWallView } from './KindnessWallView';
import { PotluckView } from './PotluckView';
import type { GuestRow, ModuleKey, LiveWallMode } from '@/lib/supabase/types';

export interface EventSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  moderationEnabled: boolean;
  logoUrl: string | null;
  liveWallMode: LiveWallMode;
}

type Tab = 'wall' | 'share' | 'wishes' | 'kindness' | 'potluck';

export function EventApp({ event }: { event: EventSummary }) {
  const [guest, setGuest] = useState<GuestRow | null>(null);
  const [checking, setChecking] = useState(true);
  const [modules, setModules] = useState<Set<ModuleKey>>(new Set());
  const [tab, setTab] = useState<Tab>('wall');

  useEffect(() => {
    let active = true;
    getGuestForEvent(event.id).then((existing) => {
      if (active) {
        setGuest(existing);
        setChecking(false);
      }
    });
    return () => {
      active = false;
    };
  }, [event.id]);

  useEffect(() => {
    if (!guest) return;
    let active = true;
    getEnabledModules(event.id).then((enabled) => {
      if (active) setModules(enabled);
    });
    return () => {
      active = false;
    };
  }, [event.id, guest]);

  if (checking) {
    return <p className="p-6 text-sm text-neutral-400">Lade …</p>;
  }

  if (!guest) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-sm rounded-3xl bg-white/90 p-8 shadow-xl backdrop-blur-sm"
        >
          {event.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.logoUrl} alt={event.name} className="mx-auto mb-4 h-16 w-16 object-contain" />
          )}
          <h1 className="mb-1 text-2xl font-semibold" style={{ color: 'var(--event-primary)' }}>
            {event.name}
          </h1>
          {event.description && (
            <p className="mb-6 text-sm text-neutral-600">{event.description}</p>
          )}
          <GuestOnboardingForm eventId={event.id} onJoined={setGuest} />
        </motion.div>
      </main>
    );
  }

  const wishWallEnabled = modules.has('wish_wall');
  const kindnessWallEnabled = modules.has('kindness_wall');
  const potluckEnabled = modules.has('potluck');
  const videoUploadEnabled = modules.has('video_upload');

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col">
      <header className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          {event.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.logoUrl} alt={event.name} className="h-8 w-8 object-contain" />
          )}
          <h1 className="text-lg font-semibold" style={{ color: 'var(--event-primary)' }}>
            {event.name}
          </h1>
        </div>
        <span className="text-xs text-neutral-500">👋 {guest.name}</span>
      </header>

      <nav className="border-b border-black/5 px-4">
        <TabBar
          layoutId="active-tab-underline"
          activeKey={tab}
          activeColor="var(--event-primary)"
          inactiveColor="var(--event-text)"
          inactiveOpacity={0.6}
          items={[
            { key: 'wall', label: '✨ Live Wall', onClick: () => setTab('wall') },
            { key: 'share', label: '📸 Teilen', onClick: () => setTab('share') },
            ...(wishWallEnabled
              ? [{ key: 'wishes', label: '🎁 Wünsche', onClick: () => setTab('wishes') }]
              : []),
            ...(kindnessWallEnabled
              ? [{ key: 'kindness', label: '💛 Kindness', onClick: () => setTab('kindness') }]
              : []),
            ...(potluckEnabled
              ? [{ key: 'potluck', label: '🍲 Ich bringe mit', onClick: () => setTab('potluck') }]
              : []),
          ]}
        />
      </nav>

      <div className="flex flex-1 flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-1 flex-col"
          >
            {tab === 'wall' &&
              (event.liveWallMode === 'grid' ? (
                <LiveWallGrid
                  eventId={event.id}
                  guestId={guest.id}
                  authorName={guest.name}
                  moderationEnabled={event.moderationEnabled}
                />
              ) : (
                <LiveWallSwipe
                  eventId={event.id}
                  guestId={guest.id}
                  authorName={guest.name}
                  moderationEnabled={event.moderationEnabled}
                  autoAdvance={event.liveWallMode === 'slideshow'}
                />
              ))}
            {tab === 'share' && (
              <UploadForm
                eventId={event.id}
                guestId={guest.id}
                authorName={guest.name}
                moderationEnabled={event.moderationEnabled}
                videoUploadEnabled={videoUploadEnabled}
                onPosted={() => setTab('wall')}
              />
            )}
            {tab === 'wishes' && wishWallEnabled && (
              <WishWallView eventId={event.id} guestId={guest.id} authorName={guest.name} />
            )}
            {tab === 'kindness' && kindnessWallEnabled && (
              <KindnessWallView
                eventId={event.id}
                guestId={guest.id}
                authorName={guest.name}
                moderationEnabled={event.moderationEnabled}
              />
            )}
            {tab === 'potluck' && potluckEnabled && (
              <PotluckView eventId={event.id} guestId={guest.id} authorName={guest.name} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}
