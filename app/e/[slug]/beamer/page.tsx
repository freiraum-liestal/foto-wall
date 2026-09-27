import { notFound } from 'next/navigation';
import { getEventBySlug } from '@/lib/events/queries';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';
import { BeamerView } from './BeamerView';
import { BeamerDisabled } from './BeamerDisabled';

export default async function BeamerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event || event.status !== 'active') notFound();

  if (!event.beamer_enabled) {
    return (
      <ThemeProvider theme={event.theme}>
        <BeamerDisabled eventName={event.name} logoUrl={event.logo_url} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={event.theme}>
      <BeamerView
        eventId={event.id}
        eventName={event.name}
        eventSlug={event.slug}
        logoUrl={event.logo_url}
        beamerMode={event.beamer_mode}
        intervalSeconds={event.beamer_interval_seconds}
        theme={event.theme}
      />
    </ThemeProvider>
  );
}
