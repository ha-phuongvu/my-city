import { defineRouting } from "next-intl/routing";
import { Language } from "./language";

// English and Vietnamese at launch (NFR-I18N-01). Every page lives under /en or /vi.
export const routing = defineRouting({
  locales: [Language.English, Language.Vietnamese],
  defaultLocale: Language.English,
});

export type Locale = (typeof routing.locales)[number];
