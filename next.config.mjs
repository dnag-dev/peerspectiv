/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['docusign-esign', 'pdf-parse', 'unpdf'],
  },
};

export default nextConfig;
