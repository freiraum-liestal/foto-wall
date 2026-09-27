import { notFound } from 'next/navigation';
import { getEventBySlug } from '@/lib/events/queries';
import { DownloadsPanel } from './DownloadsPanel';

export default async function DownloadsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  return (
    <main className="mx-auto max-w-2xl">
      <div className="px-4 pt-4">
        <h1 className="text-xl font-semibold text-neutral-900">Downloads</h1>
        <p className="text-sm text-neutral-500">{event.name}</p>
      </div>
      <DownloadsPanel eventId={event.id} />
    </main>
  );
}
