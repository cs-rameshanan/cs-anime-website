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
      // Non-prod CDN (dev11, dev22, etc.)
      {
        protocol: 'https',
        hostname: '*.csnonprod.com',
      },
      // Placeholder images
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
    ],
  },

  // Contentstack Launch: use deployment UID as build ID for cache revalidation
  generateBuildId: () => {
    return process.env.CONTENTSTACK_LAUNCH_DEPLOYMENT_UID || `local-${Date.now()}`;
  },

  // Cache headers for Contentstack Launch (CDN-level caching)
  async headers() {
    return [
      {
        // Cache all pages for 60s on CDN, revalidate in background
        source: '/:path*',
        headers: [
          {
            key: 'cache-control',
            value: 'max-age=0, s-maxage=60, stale-while-revalidate',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

