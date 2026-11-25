import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Old screen names keep working. Query strings (?b=LV) pass through unchanged.
  async redirects() {
    return [
      { source: "/demo", destination: "/demo/desk", permanent: false },
      { source: "/demo/rack", destination: "/demo/fees", permanent: false },
      { source: "/demo/board", destination: "/demo/freeze", permanent: false },
      { source: "/demo/owner", destination: "/demo/report", permanent: false },
      { source: "/g/:branch/rack", destination: "/g/:branch/fees", permanent: false },
      { source: "/g/:branch/board", destination: "/g/:branch/freeze", permanent: false },
      { source: "/g/:branch/owner", destination: "/g/:branch/report", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self)" },
        ],
      },
      { source: "/m/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex" }] },
      { source: "/r/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex" }] },
    ];
  },
};

export default nextConfig;
