import { notFound } from 'next/navigation';
import { getEventBySlug } from '@/lib/events/queries';
import { EventSettingsForm } from './EventSettingsForm';
import { QRCodeCard } from './QRCodeCard';

export default async function EventSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-xl font-semibold text-neutral-900">Event-Einstellungen</h1>
      <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
        <EventSettingsForm event={event} />
        <QRCodeCard eventSlug={event.slug} />
      </div>
    </main>
  );
}
