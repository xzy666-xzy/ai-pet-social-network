/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: [
    "192.168.0.32",
    "localhost",
    "127.0.0.1",
  ],
}

export default nextConfig