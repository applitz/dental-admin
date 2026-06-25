import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/admin";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  basePath,
};

export default withNextIntl(nextConfig);
