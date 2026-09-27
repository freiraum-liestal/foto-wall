'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function QRCodeCard({ eventSlug }: { eventSlug: string }) {
  const [result, setResult] = useState<{ dataUrl: string; guestUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const url = `${window.location.origin}/e/${eventSlug}`;
    QRCode.toDataURL(url, { width: 320, margin: 1 })
      .then((dataUrl) => setResult({ dataUrl, guestUrl: url }))
      .catch(() => setResult({ dataUrl: '', guestUrl: url }));
  }, [eventSlug]);

  const dataUrl = result?.dataUrl || null;
  const guestUrl = result?.guestUrl ?? '';

  async function handleCopy() {
    await navigator.clipboard.writeText(guestUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col items-center gap-3 card p-4">
      <h3 className="self-start text-sm font-semibold">QR-Code für Gäste</h3>
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt={`QR-Code zu ${guestUrl}`} className="h-40 w-40" />
      ) : (
        <div className="h-40 w-40 animate-pulse rounded bg-neutral-100" />
      )}
      <p className="break-all text-center font-mono text-xs text-neutral-500">{guestUrl}</p>
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
        >
          {copied ? 'Kopiert ✓' : 'Link kopieren'}
        </button>
        {dataUrl && (
          <a
            href={dataUrl}
            download={`qr-${eventSlug}.png`}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
          >
            QR herunterladen
          </a>
        )}
      </div>
    </div>
  );
}
