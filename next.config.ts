import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

const nextConfig: NextConfig = {
  turbopack: {},
  output: process.env.OUTPUT_EXPORT === 'true' ? 'export' : undefined,
  images: {
    unoptimized: true,
  },
  ...(process.env.OUTPUT_EXPORT !== 'true' && {
    async headers() {
      return [
        {
          source: "/:path*",
          headers: [
            { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://clerk.com https://*.clerk.com https://clerk.bokra101.vercel.app https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://*.tile.openstreetmap.org https://server.arcgisonline.com https://cdnjs.cloudflare.com https://img.clerk.com https://images.clerk.dev https://clerk.bokra101.vercel.app https://i.scdn.co https://*.scdn.co https://*.spotifycdn.com https://mosaic.scdn.co https://*.spotify.com https://lh3.googleusercontent.com; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.clerk.accounts.dev https://clerk.com https://*.clerk.com https://clerk.bokra101.vercel.app https://api.clerk.com https://*.tile.openstreetmap.org https://server.arcgisonline.com https://fcmregistrations.googleapis.com https://firebaseinstallations.googleapis.com https://*.googleapis.com https://api.spotify.com https://*.upstash.io wss://*.upstash.io; frame-src 'self' https://open.spotify.com https://*.clerk.accounts.dev https://clerk.com https://clerk.bokra101.vercel.app; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self';" },
            { key: "X-Frame-Options", value: "SAMEORIGIN" },
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
            { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
            { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" }
          ]
        }
      ];
    }
  })
};

export default withPWA(nextConfig);
