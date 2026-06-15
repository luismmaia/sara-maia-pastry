/** @type {import('next').NextConfig} */
const nextConfig = {
  // Em fase de testes: não bloquear o build por avisos de estilo de código (ESLint).
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // Quando carregares fotos reais (ex.: storage do Render/S3), acrescenta o domínio aqui.
    ],
  },
};
export default nextConfig;
