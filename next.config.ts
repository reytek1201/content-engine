import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["ffmpeg-static"],
  outputFileTracingIncludes: {
    "/api/export-video": ["./app/fonts/**/*"],
    "/api/exports/*": ["./app/fonts/**/*"],
    "/api/webhooks/fal": ["./app/fonts/**/*"],
  },
};

export default nextConfig;
