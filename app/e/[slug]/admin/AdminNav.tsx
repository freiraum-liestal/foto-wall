'use client';

import { usePathname } from 'next/navigation';
import { ShieldCheck, Settings, Download, ExternalLink, MonitorPlay } from 'lucide-react';
import { TabBar } from '@/components/TabBar';

export function AdminNav({ eventSlug }: { eventSlug: string }) {
  const pathname = usePathname();
  const base = `/e/${eventSlug}/admin`;

  const activeKey = pathname.startsWith(`${base}/settings`)
    ? 'settings'
    : pathname.startsWith(`${base}/downloads`)
      ? 'downloads'
      : 'moderation';

  return (
    <nav className="flex items-center gap-1 border-b border-neutral-200 bg-white px-4">
      <TabBar
        layoutId="admin-active-tab"
        activeKey={activeKey}
        activeColor="var(--event-primary, #171717)"
        inactiveColor="#a3a3a3"
        items={[
          { key: 'moderation', label: 'Moderation', icon: ShieldCheck, href: base },
          { key: 'settings', label: 'Einstellungen', icon: Settings, href: `${base}/settings` },
          { key: 'downloads', label: 'Downloads', icon: Download, href: `${base}/downloads` },
        ]}
      />
      <a
        href={`/e/${eventSlug}/beamer`}
        target="_blank"
        rel="noopener noreferrer"
        className="ml-auto flex items-center gap-1 rounded-lg bg-neutral-900 px-2.5 py-1.5 text-xs font-medium text-white"
      >
        <MonitorPlay size={13} /> Beamer
      </a>
      <a
        href={`/e/${eventSlug}`}
        className="flex items-center gap-1 py-3 text-xs text-neutral-400 hover:text-neutral-600"
      >
        Gast-Ansicht <ExternalLink size={12} />
      </a>
    </nav>
  );
}
