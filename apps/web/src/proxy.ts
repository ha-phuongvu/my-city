import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Sends visitors to their language: / becomes /en or /vi from the browser's language or the last choice
export default createMiddleware(routing);

export const config = {
  // everything except the API, Next's own files and files with an extension (images, models, decoders)
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
