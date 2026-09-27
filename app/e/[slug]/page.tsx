import { notFound } from 'next/navigation';
import { getEventBySlug } from '@/lib/events/queries';
import { EventApp } from './EventApp';

export default async function EventGuestPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event || event.status !== 'active') notFound();

  return (
    <EventApp
      event={{
        id: event.id,
        slug: event.slug,
        name: event.name,
        description: event.description,
        moderationEnabled: event.moderation_enabled,
        logoUrl: event.logo_url,
        liveWallMode: event.live_wall_mode,
      }}
    />
  );
}
