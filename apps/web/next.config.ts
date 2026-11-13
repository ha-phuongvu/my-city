import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "node:path";

// one .env at the repo root serves every app and package
loadEnvConfig(path.join(process.cwd(), "../.."));

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // app/global-not-found.tsx: unknown addresses show the world, since the root layout is under [locale]
  experimental: { globalNotFound: true },
  // workspace packages are TypeScript source, compiled by Next
  transpilePackages: ["@my-city/db"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
