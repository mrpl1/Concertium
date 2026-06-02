/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enables src/instrumentation.ts (the in-process scheduler hook).
  experimental: {
    instrumentationHook: true,
  },
};

export default nextConfig;
