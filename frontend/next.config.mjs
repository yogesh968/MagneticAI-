/** @type {import('next').NextConfig} */

// Server-side only — never exposed to the browser. Falls back to localhost for dev.
const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:5000").replace(/\/$/, "");

const nextConfig = {
  reactStrictMode: true,
  // Standalone output gives smaller, self-contained deployments on Vercel/Railway
  output: "standalone",

  /**
   * Proxy the API through this origin.
   *
   * This is what makes httpOnly cookie auth possible at all: cookies are
   * domain-scoped, so a backend on its own domain cannot set a cookie that this
   * app's middleware can read. Routing every dashboard call through /api here
   * means the browser sees a single origin, the auth cookie lands on it,
   * middleware can read it, and SameSite=Lax genuinely blocks CSRF.
   *
   * The embeddable widget is deliberately NOT proxied — it runs on customer
   * domains and talks to the backend directly.
   */
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },

  // Silence the punycode deprecation warning from transitive deps
  webpack(config) {
    config.resolve.fallback = { ...config.resolve.fallback, punycode: false };
    return config;
  },
};
export default nextConfig;
