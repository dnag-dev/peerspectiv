/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['docusign-esign', 'pdf-parse'],
  },
};

export default nextConfig;
