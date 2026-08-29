import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: "/library/maya-egregor-gods", destination: "/library/maya-egregor-gods/index.html" },
      { source: "/library/maya-calendar", destination: "/library/maya-calendar/index.html" },
      { source: "/library/maya-exorcism", destination: "/library/maya-exorcism/index.html" },
      { source: "/library/maya-mysteries", destination: "/library/maya-mysteries/index.html" },
    ];
  },
};

export default nextConfig;
