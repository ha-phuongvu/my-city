import { defineRouting } from "next-intl/routing";

// English and Vietnamese at launch (NFR-I18N-01). Every page lives under /en or /vi.
export const routing = defineRouting({
  locales: ["en", "vi"],
  defaultLocale: "en",
});

export type Locale = (typeof routing.locales)[number];
