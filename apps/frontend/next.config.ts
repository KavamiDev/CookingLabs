import type { NextConfig } from "next";

// Adresse de l'API NestJS. En prod (Vercel) : l'URL Railway/Fly, définie dans les variables du projet.
const apiUrl = process.env.API_URL ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Le navigateur n'appelle que /api sur le domaine du site : pas de CORS, et les cookies de session passent.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
