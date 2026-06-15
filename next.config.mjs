/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // Quando carregares fotos reais (ex.: storage do Render/S3), acrescenta o domínio aqui.
    ],
  },
};
export default nextConfig;
