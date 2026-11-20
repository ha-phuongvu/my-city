import { getTranslations } from "next-intl/server";
import { World } from "@/components/world/World";

// The whole site is the 3D world, filling the screen with no text on the page, like Bruno Simon's
// portfolio. The label is for screen readers only.
export default async function WorldPage() {
  const t = await getTranslations("World");
  return (
    <main className="fixed inset-0">
      <World
        label={t("canvasLabel")}
        opening={{ enter: t("opening.enter"), building: t("opening.building"), ready: t("opening.ready") }}
      />
    </main>
  );
}
