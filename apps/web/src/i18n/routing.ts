import { defineRouting } from "next-intl/routing";
import { Language } from "./language";

export const routing = defineRouting({
  locales: [Language.English, Language.Vietnamese],
  defaultLocale: Language.English,
});

export type Locale = (typeof routing.locales)[number];
