import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Do not ignore build errors in production — fixes P0 security/quality issue.
  ignoreBuildErrors: false,
  // Do not ignore ESLint during builds.
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Do not ignore TypeScript errors during builds.
  typescript: {
    ignoreBuildErrors: false,
  },
  // Allow images from these remote hosts (TMDB, IMDB, Telegram, custom thumbnails).
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org" },
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "ia.media-imdb.com" },
      { protocol: "https", hostname: "api.telegram.org" },
      { protocol: "https", hostname: "**" },
    ],
  },
  // Webpack fallbacks:
  // - `crypto`: bcryptjs tries to require('crypto') at module-eval time, which
  //   breaks the Edge bundle. We mark it as `false` so the bundler ignores it
  //   (bcryptjs falls back to its own pure-JS implementation at runtime).
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      crypto: false,
      fs: false,
      path: false,
    };
    return config;
  },
  // Security headers applied to all routes.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      // Admin routes: deny iframing (defense-in-depth against clickjacking).
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Frame-Options", value: "DENY" }],
      },
    ];
  },
};

export default nextConfig;
