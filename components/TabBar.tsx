'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

export interface TabItem {
  key: string;
  label: string;
  icon?: LucideIcon;
  href?: string; // gesetzt -> rendert <a> (echte Navigation, z.B. AdminNav)
  onClick?: () => void; // gesetzt -> rendert <button> (State-Wechsel, z.B. Gast-Tabs)
}

/**
 * Ersetzt vier separat gebaute, aber strukturell identische Tab-Leisten
 * (EventApp Gast-Tabs, ModerationTabs, EventSettingsForm-Tabs, AdminNav) -
 * überall dieselbe layoutId-Technik für die animierte Unterstreichung.
 */
export function TabBar({
  items,
  activeKey,
  layoutId,
  activeColor = '#171717',
  inactiveColor = '#a3a3a3',
  inactiveOpacity = 1,
}: {
  items: TabItem[];
  activeKey: string;
  layoutId: string;
  activeColor?: string;
  inactiveColor?: string;
  inactiveOpacity?: number;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto">
      {items.map((item) => {
        const active = item.key === activeKey;
        const Icon = item.icon;
        const content = (
          <>
            {Icon && <Icon size={14} style={{ color: active ? activeColor : inactiveColor }} />}
            <span style={{ color: active ? activeColor : inactiveColor, opacity: active ? 1 : inactiveOpacity }}>
              {item.label}
            </span>
            {active && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-x-0 -bottom-px h-0.5"
                style={{ backgroundColor: activeColor }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </>
        );
        const className =
          'relative flex flex-shrink-0 items-center gap-1.5 px-3 py-2.5 text-sm font-medium';

        return item.href ? (
          <a key={item.key} href={item.href} className={className}>
            {content}
          </a>
        ) : (
          <button key={item.key} onClick={item.onClick} className={className}>
            {content}
          </button>
        );
      })}
    </div>
  );
}
