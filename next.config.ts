import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Allow GIF/MP4 uploads through Ops media route (still subject to Vercel plan limits).
    serverActions: {
      bodySizeLimit: "50mb",
    },
    middlewareClientMaxBodySize: "50mb",
  },
};

export default nextConfig;
