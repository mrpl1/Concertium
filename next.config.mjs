/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ESLint 9 + next 16 config can vary by machine; don't block builds on lint.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
