'use client';

import { motion } from 'framer-motion';
import { ImageIcon, Sparkles, MonitorPlay, ShieldCheck, QrCode, Heart, PackageOpen } from 'lucide-react';

const DISPLAY_FONT =
  "Georgia, 'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', serif";

export default function LandingPage() {
  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <Hero />
      <HowItWorks />
      <Features />
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#2B1B2E] px-6 py-20 text-[#FBF3EE] sm:py-28">
      <div className="mx-auto grid max-w-5xl gap-16 sm:grid-cols-[1.1fr_0.9fr] sm:items-center">
        <div>
          <a href="/admin" className="mb-16 inline-block text-sm text-[#D4A24E] hover:underline">
            Für Veranstalter
          </a>
          <h1
            style={{ fontFamily: DISPLAY_FONT }}
            className="text-4xl leading-[1.1] sm:text-5xl"
          >
            Alle Fotos vom Fest,
            <br />
            live an einem Ort.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-[#FBF3EE]/80">
            Gäste scannen einen QR-Code und teilen Fotos direkt vom Handy –
            ohne App-Installation. Ihr behaltet nach dem Fest alles
            gesammelt an einem Ort.
          </p>
          <a
            href="/admin"
            className="mt-8 inline-block rounded-full bg-[#D4A24E] px-7 py-3 text-sm font-semibold text-[#2B1B2E]"
          >
            Jetzt Event anlegen
          </a>
        </div>
        <PhotoWallCollage />
      </div>
    </section>
  );
}

/**
 * Der eine bewusst animierte Moment der Seite (siehe Design-Prinzip:
 * ein orchestrierter Reveal statt überall verstreuter Hover-Effekte).
 * Die "Fotos" sind reine Farbflächen - es gibt keine echten Beispielfotos,
 * das Motiv (gekippte, angepinnte Polaroids) trägt trotzdem den Bezug
 * zum Produkt.
 */
function PhotoWallCollage() {
  const tiles = [
    { color: '#D4A24E', rotate: -8, x: '2%', y: '6%', size: 132 },
    { color: '#C97B84', rotate: 6, x: '38%', y: '0%', size: 108 },
    { color: '#8A5B72', rotate: -3, x: '58%', y: '32%', size: 120 },
    { color: '#E8C77A', rotate: 10, x: '8%', y: '46%', size: 96 },
    { color: '#B5697A', rotate: -12, x: '32%', y: '58%', size: 116 },
  ];

  return (
    <div className="relative hidden h-72 sm:block">
      {tiles.map((tile, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.7, rotate: 0, x: 0, y: -20 }}
          animate={{ opacity: 1, scale: 1, rotate: tile.rotate, x: 0, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="absolute rounded-sm bg-white p-2 shadow-xl"
          style={{ left: tile.x, top: tile.y, width: tile.size }}
        >
          <div className="aspect-square rounded-[2px]" style={{ backgroundColor: tile.color }} />
        </motion.div>
      ))}
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { icon: QrCode, title: 'Scannen', text: 'QR-Code am Eingang oder auf dem Tisch, keine App nötig.' },
    { icon: ImageIcon, title: 'Teilen', text: 'Foto hochladen, kommentieren, mit Emoji reagieren.' },
    { icon: PackageOpen, title: 'Behalten', text: 'Nach dem Fest alle Erinnerungen gesammelt herunterladen.' },
  ];

  return (
    <section className="bg-[#FAF6F2] px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <div className="grid gap-10 sm:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.title}>
              <p className="mb-3 text-sm font-medium text-[#8A5B72]">{i + 1}</p>
              <step.icon size={22} className="mb-3 text-[#2B1B2E]" />
              <h3 style={{ fontFamily: DISPLAY_FONT }} className="text-lg text-[#2B1B2E]">
                {step.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#2B1B2E]/70">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="bg-white px-6 py-16">
      <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
        <FeatureCard
          icon={Sparkles}
          title="Live Wall"
          text="Fotos erscheinen in Echtzeit auf einer gemeinsamen Wand – am Handy oder gross auf dem Beamer."
        />
        <FeatureCard
          icon={MonitorPlay}
          title="Ein eigener Beamer-Modus"
          text="Diashow oder animierte Fotowand fürs Fernsehen oder den Projektor, mit eurem Logo."
        />
        <FeatureCard
          icon={Heart}
          title="Mehr als nur Fotos"
          text="Wish Wall für Musikwünsche, eine Kindness Wall mit der Frage des Tages, und eine Potluck-Liste, wer was mitbringt."
          wide
        />
        <FeatureCard
          icon={ShieldCheck}
          title="Datenschutz ernst genommen"
          text="Eure Daten bleiben in der EU. Kein Gesichts-Scan, keine biometrische Auswertung."
        />
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  text,
  wide,
}: {
  icon: typeof Sparkles;
  title: string;
  text: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-6 ${wide ? 'bg-[#2B1B2E] text-[#FBF3EE] sm:col-span-2' : 'border border-neutral-200'}`}
    >
      <Icon size={20} className={wide ? 'text-[#D4A24E]' : 'text-[#2B1B2E]'} />
      <h3
        style={{ fontFamily: DISPLAY_FONT }}
        className={`mt-3 text-lg ${wide ? 'text-[#FBF3EE]' : 'text-[#2B1B2E]'}`}
      >
        {title}
      </h3>
      <p className={`mt-1.5 text-sm leading-relaxed ${wide ? 'text-[#FBF3EE]/75' : 'text-neutral-600'}`}>
        {text}
      </p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-neutral-100 px-6 py-8 text-center text-xs text-neutral-400">
      © {new Date().getFullYear()} – Gebaut für Feste, die man nicht vergisst.
    </footer>
  );
}
