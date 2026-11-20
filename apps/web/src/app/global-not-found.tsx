import type { Metadata } from "next";
import { World } from "@/components/world/World";
import en from "../../messages/en.json";
import "./globals.css";

// Any unknown address shows the world too (still with a 404 status), since the site has no text
// pages. This file skips the [locale] layout, so it brings its own <html>, styles and English label.
export const metadata: Metadata = { title: en.Metadata.title };

export default function GlobalNotFound() {
  return (
    <html lang="en" className="h-full">
      <body className="h-full overflow-hidden">
        <main className="fixed inset-0">
          <World label={en.World.canvasLabel} opening={en.World.opening} />
        </main>
      </body>
    </html>
  );
}
