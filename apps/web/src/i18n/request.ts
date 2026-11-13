import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { routing } from "./routing";

export default getRequestConfig(async ({ locale }) => {
  // an explicit locale (e.g. getTranslations({ locale })) wins, otherwise the [locale] segment
  const requested = locale ?? (await rootLocale());
  const current = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return {
    locale: current,
    messages: (await import(`../../messages/${current}.json`)).default,
  };
});
