'use client';

import { useState } from 'react';
import { sendAdminMagicLink } from '@/lib/auth/admin';

export function MagicLinkLoginCard({
  title,
  redirectPath,
}: {
  title: string;
  redirectPath: string;
}) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await sendAdminMagicLink(email, redirectPath);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 p-8">
        <h1 className="mb-4 text-lg font-semibold">{title}</h1>
        {sent ? (
          <p className="text-sm text-neutral-600">
            Link geschickt an <strong>{email}</strong>. E-Mail öffnen und Link anklicken.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="deine@email.ch"
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? 'Sende Link …' : 'Magic Link senden'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
