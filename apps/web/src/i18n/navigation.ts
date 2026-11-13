import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware versions of Next's navigation APIs: <Link href="/story"> goes to /en/story or /vi/story
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
