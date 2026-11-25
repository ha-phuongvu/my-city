import { getLocale, getTranslations } from "next-intl/server";
import { World } from "@/components/world/core/World";

export default async function WorldPage() {
  const t = await getTranslations("World");
  const c = await getTranslations("World.calendar");
  const p = await getTranslations("World.player");
  const language = await getLocale();
  return (
    <main className="fixed inset-0">
      <World
        label={t("canvasLabel")}
        loading={t("opening.loading")}
        opening={{
          enter: t("opening.enter"),
          building: t("opening.building"),
          buildingWinter: t("opening.buildingWinter"),
          ready: t("opening.ready"),
        }}
        frame={{
          language,
          calendar: {
            open: c.raw("open"),
            previous: c("previous"),
            next: c("next"),
            today: c("today"),
          },
          player: {
            label: p("label"),
            playing: p("playing"),
            play: p("play"),
            pause: p("pause"),
            previous: p("previous"),
            next: p("next"),
            empty: p("empty"),
          },
        }}
      />
    </main>
  );
}
