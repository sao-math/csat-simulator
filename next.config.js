/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/csat-simulator',
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
