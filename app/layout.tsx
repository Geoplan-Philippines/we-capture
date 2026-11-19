import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { event } from "@/lib/event";
import { archivo } from "@/lib/fonts";
import { site } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.name,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: event.colors.night,
  colorScheme: "dark",
};

const eventColors = {
  "--event-night": event.colors.night,
  "--event-primary": event.colors.primary,
  "--event-accent": event.colors.accent,
  "--event-panel": event.colors.panel,
} as CSSProperties;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${archivo.variable} h-full antialiased`} style={eventColors}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
