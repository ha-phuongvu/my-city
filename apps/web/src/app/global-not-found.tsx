import type { Metadata } from "next";
import { World } from "@/components/world/core/World";
import { Language } from "@/i18n/language";
import en from "../../messages/en.json";
import "./globals.css";

export const metadata: Metadata = { title: en.Metadata.title };

export default function GlobalNotFound() {
  return (
    <html lang={Language.English} className="h-full">
      <body className="h-full overflow-hidden">
        <main className="fixed inset-0">
          <World
            label={en.World.canvasLabel}
            opening={en.World.opening}
            frame={{
              language: Language.English,
              calendar: en.World.calendar,
              player: en.World.player,
            }}
          />
        </main>
      </body>
    </html>
  );
}
