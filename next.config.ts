import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
  experimental: {
    serverActions: {
      // Allow multi-photo uploads via server action FormData
      bodySizeLimit: "20mb",
    },
  },
};

export default withNextIntl(nextConfig);
