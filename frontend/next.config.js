/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.CAPACITOR_BUILD === "1" ? "export" : "standalone",
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
  // Ensure environment variables are properly embedded
  publicRuntimeConfig: {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
};

module.exports = nextConfig;
