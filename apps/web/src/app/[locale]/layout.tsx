import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { Music } from "@/components/world/ui/Music";
import { routing } from "@/i18n/routing";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return { title: t("title"), description: t("description") };
}

export default async function LocaleLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await rootLocale();
  if (!hasLocale(routing.locales, locale)) notFound();

  const p = await getTranslations("World.player");
  return (
    <html lang={locale} className="h-full">
      <body className="h-full overflow-hidden">
        {children}
        <Music
          words={{
            label: p("label"),
            playing: p("playing"),
            play: p("play"),
            pause: p("pause"),
            previous: p("previous"),
            next: p("next"),
            empty: p("empty"),
            seek: p("seek"),
            at: p.raw("at"),
          }}
        />
      </body>
    </html>
  );
}
