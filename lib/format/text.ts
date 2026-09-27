/**
 * Kurzes relatives Zeitformat ("vor 5 Min", "gestern"). Kein i18n-Overkill
 * für ein Detail wie Kommentar-Zeitstempel - reicht für den deutschen
 * Sprachraum, den die App aktuell bedient.
 */
export function formatTimeAgo(isoTimestamp: string): string {
  const diffMs = Date.now() - new Date(isoTimestamp).getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'gerade eben';
  if (diffMinutes < 60) return `vor ${diffMinutes} Min`;
  if (diffHours < 24) return `vor ${diffHours} Std`;
  if (diffDays === 1) return 'gestern';
  if (diffDays < 7) return `vor ${diffDays} Tagen`;
  return new Date(isoTimestamp).toLocaleDateString('de-CH', { day: 'numeric', month: 'short' });
}

/**
 * Deterministische, angenehme Farbe aus einem Namen - für Avatar-Kreise.
 * Kein Zufall (damit derselbe Name immer dieselbe Farbe hat), keine
 * Abhängigkeit vom Event-Theme (Kommentatoren sollen sich optisch
 * unterscheiden, nicht alle in der Button-Farbe verschwimmen).
 */
export function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 55%)`;
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : '';
  return (first + second).toUpperCase();
}
