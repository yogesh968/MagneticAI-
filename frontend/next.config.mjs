/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output gives smaller, self-contained deployments on Vercel/Railway
  output: "standalone",
  async headers() {
    return [{ source: "/(.*)", headers: [{ key: "X-Frame-Options", value: "DENY" }] }];
  },
  // Silence the punycode deprecation warning from transitive deps
  webpack(config) {
    config.resolve.fallback = { ...config.resolve.fallback, punycode: false };
    return config;
  },
};
export default nextConfig;
