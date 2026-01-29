/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // External anime image sources
      {
        protocol: 'https',
        hostname: 'cdn.myanimelist.net',
      },
      // Contentstack CDN domains
      {
        protocol: 'https',
        hostname: 'images.contentstack.io',
      },
      {
        protocol: 'https',
        hostname: 'assets.contentstack.io',
      },
      {
        protocol: 'https',
        hostname: '*.contentstack.com',
      },
      // Placeholder images
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
    ],
  },
};

module.exports = nextConfig;

