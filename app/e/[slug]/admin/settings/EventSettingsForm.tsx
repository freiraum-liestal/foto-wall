'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, Palette, LayoutGrid, MonitorPlay, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { TabBar } from '@/components/TabBar';
import { updateEventSettings } from '@/lib/events/admin';
import { getEnabledModules, setModuleEnabled } from '@/lib/events/modules';
import { getActivePrompt, setActivePrompt } from '@/lib/kindnesswall/api';
import { uploadEventLogo } from '@/lib/media/logoUpload';
import { getErrorMessage } from '@/lib/utils/errors';
import { BasicsTab } from './BasicsTab';
import { ThemeTab } from './ThemeTab';
import { ModulesTab } from './ModulesTab';
import { BeamerTab } from './BeamerTab';
import type { EventRow } from '@/lib/supabase/types';

type SettingsTab = 'basics' | 'theme' | 'modules' | 'beamer';

const TABS: { key: SettingsTab; label: string; icon: typeof Info }[] = [
  { key: 'basics', label: 'Grunddaten', icon: Info },
  { key: 'theme', label: 'Theme', icon: Palette },
  { key: 'modules', label: 'Module', icon: LayoutGrid },
  { key: 'beamer', label: 'Beamer', icon: MonitorPlay },
];

export function EventSettingsForm({ event: initialEvent }: { event: EventRow }) {
  const [event, setEvent] = useState(initialEvent);
  const [tab, setTab] = useState<SettingsTab>('basics');
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [wishWallEnabled, setWishWallEnabled] = useState(false);
  const [kindnessWallEnabled, setKindnessWallEnabled] = useState(false);
  const [potluckEnabled, setPotluckEnabled] = useState(false);
  const [videoUploadEnabled, setVideoUploadEnabled] = useState(false);
  const [kindnessQuestion, setKindnessQuestion] = useState('');
  const [kindnessSaving, setKindnessSaving] = useState(false);
  const [modulesLoading, setModulesLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([getEnabledModules(event.id), getActivePrompt(event.id)])
      .then(([enabled, prompt]) => {
        if (!active) return;
        setVideoUploadEnabled(enabled.has('video_upload'));
        setWishWallEnabled(enabled.has('wish_wall'));
        setKindnessWallEnabled(enabled.has('kindness_wall'));
        setPotluckEnabled(enabled.has('potluck'));
        setKindnessQuestion(prompt?.question ?? '');
      })
      .finally(() => {
        if (active) setModulesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [event.id]);

  async function save(patch: Partial<EventRow>) {
    setSaving(true);
    try {
      const updated = await updateEventSettings(event.id, patch);
      setEvent(updated);
      toast.success('Gespeichert.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Speichern fehlgeschlagen.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleModuleToggle(
    moduleKey: 'wish_wall' | 'kindness_wall' | 'potluck' | 'video_upload',
    setEnabled: (v: boolean) => void,
    enabled: boolean
  ) {
    setEnabled(enabled);
    try {
      await setModuleEnabled(event.id, moduleKey, enabled);
      toast.success('Gespeichert.');
    } catch (err) {
      setEnabled(!enabled);
      toast.error(getErrorMessage(err, 'Speichern fehlgeschlagen.'));
    }
  }

  async function handleKindnessQuestionSave() {
    if (!kindnessQuestion.trim()) return;
    setKindnessSaving(true);
    try {
      await setActivePrompt(event.id, kindnessQuestion);
      toast.success('Frage gespeichert.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Frage konnte nicht gespeichert werden.'));
    } finally {
      setKindnessSaving(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const logoUrl = await uploadEventLogo(event.id, file);
      await save({ logo_url: logoUrl });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Logo-Upload fehlgeschlagen.'));
    } finally {
      setLogoUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="border-b border-neutral-200">
        <TabBar
          layoutId="settings-active-tab"
          activeKey={tab}
          items={TABS.map((t) => ({ ...t, onClick: () => setTab(t.key) }))}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="flex flex-col gap-4"
        >
          {tab === 'basics' && (
            <BasicsTab
              event={event}
              setEvent={setEvent}
              save={save}
              logoUploading={logoUploading}
              onLogoUpload={handleLogoUpload}
            />
          )}
          {tab === 'theme' && <ThemeTab event={event} setEvent={setEvent} save={save} />}
          {tab === 'modules' && (
            <ModulesTab
              event={event}
              save={save}
              modulesLoading={modulesLoading}
              videoUploadEnabled={videoUploadEnabled}
              onVideoUploadToggle={(v) => handleModuleToggle('video_upload', setVideoUploadEnabled, v)}
              wishWallEnabled={wishWallEnabled}
              onWishWallToggle={(v) => handleModuleToggle('wish_wall', setWishWallEnabled, v)}
              kindnessWallEnabled={kindnessWallEnabled}
              onKindnessToggle={(v) => handleModuleToggle('kindness_wall', setKindnessWallEnabled, v)}
              kindnessQuestion={kindnessQuestion}
              onKindnessQuestionChange={setKindnessQuestion}
              onKindnessQuestionSave={handleKindnessQuestionSave}
              kindnessSaving={kindnessSaving}
              potluckEnabled={potluckEnabled}
              onPotluckToggle={(v) => handleModuleToggle('potluck', setPotluckEnabled, v)}
            />
          )}
          {tab === 'beamer' && <BeamerTab event={event} setEvent={setEvent} save={save} />}
        </motion.div>
      </AnimatePresence>

      <section className="flex items-center justify-between card p-4">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-medium text-neutral-900">
            {event.status === 'active' && <CheckCircle2 size={15} className="text-green-600" />}
            Status: <span className="uppercase">{event.status}</span>
          </p>
          <p className="text-xs text-neutral-500">
            {event.status === 'draft'
              ? 'Gäste können das Event noch nicht sehen.'
              : 'Event ist live und für Gäste erreichbar.'}
          </p>
        </div>
        {event.status !== 'active' && (
          <motion.button
            onClick={() => save({ status: 'active' })}
            disabled={saving}
            whileTap={{ scale: 0.97 }}
            className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
          >
            Veröffentlichen
          </motion.button>
        )}
      </section>
    </div>
  );
}
