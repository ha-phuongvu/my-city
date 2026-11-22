import { getLocale, getTranslations } from "next-intl/server";
import { World } from "@/components/world/core/World";

// The whole site is the 3D world, filling the screen with no text on the page, like Bruno Simon's
// portfolio. The label is for screen readers only; the calendar and the record player on the frame
// have their own words.
export default async function WorldPage() {
  const t = await getTranslations("World");
  const c = await getTranslations("World.calendar");
  const p = await getTranslations("World.player");
  const language = await getLocale();
  return (
    <main className="fixed inset-0">
      <World
        label={t("canvasLabel")}
        opening={{
          enter: t("opening.enter"),
          building: t("opening.building"),
          buildingWinter: t("opening.buildingWinter"),
          ready: t("opening.ready"),
        }}
        frame={{
          language,
          calendar: {
            // (its {date} is filled in on the page, each day)
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
