import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Event-Plattform",
  description: "Multi-Tenant Event-Foto-Plattform (Fundament)",
};

// Bewusst System-Font-Stack statt next/font/google: Events sollen später
// pro Kunde eigene Fonts im Theme definieren können, ohne eine globale
// Google-Fonts-Abhängigkeit im Root-Layout mitzuschleppen.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
