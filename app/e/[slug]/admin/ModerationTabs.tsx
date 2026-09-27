'use client';

import { useState } from 'react';
import { Image as ImageIcon, MessageCircle } from 'lucide-react';
import { TabBar } from '@/components/TabBar';
import { ModerationQueue } from './ModerationQueue';
import { CommentModerationQueue } from './CommentModerationQueue';

export function ModerationTabs({ eventId }: { eventId: string }) {
  const [tab, setTab] = useState<'posts' | 'comments'>('posts');

  return (
    <div>
      <div className="border-b border-neutral-200 bg-white px-2">
        <TabBar
          layoutId="moderation-active-tab"
          activeKey={tab}
          items={[
            { key: 'posts', label: 'Beiträge', icon: ImageIcon, onClick: () => setTab('posts') },
            { key: 'comments', label: 'Kommentare', icon: MessageCircle, onClick: () => setTab('comments') },
          ]}
        />
      </div>
      {tab === 'posts' ? (
        <ModerationQueue eventId={eventId} />
      ) : (
        <CommentModerationQueue eventId={eventId} />
      )}
    </div>
  );
}
