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
          source: "/bokra.apk",
          headers: [
            { key: "Content-Type", value: "application/vnd.android.package-archive" },
            { key: "Content-Disposition", value: 'attachment; filename="bokra.apk"' },
            { key: "Cache-Control", value: "public, max-age=3600, must-revalidate" }
          ]
        },
        {
          source: "/bokra-windows.zip",
          headers: [
            { key: "Content-Type", value: "application/zip" },
            { key: "Content-Disposition", value: 'attachment; filename="bokra-windows.zip"' },
            { key: "Cache-Control", value: "public, max-age=3600, must-revalidate" }
          ]
        },
        {
          source: "/:all*(svg|jpg|png|webp|ico|woff|woff2)",
          headers: [
            { key: "Cache-Control", value: "public, max-age=31536000, immutable" }
          ]
        },
        {
          source: "/:path*",
          headers: [
            { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://*.clerk.accounts.dev https://clerk.com https://*.clerk.com https://clerk.bokra101.vercel.app https://bokra101.vercel.app https://apis.google.com https://accounts.google.com https://www.gstatic.com https://*.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://server.arcgisonline.com https://*.basemaps.cartocdn.com https://basemaps.cartocdn.com https://*.openfreemap.org https://tiles.openfreemap.org https://cdnjs.cloudflare.com https://img.clerk.com https://images.clerk.dev https://clerk.bokra101.vercel.app https://bokra101.vercel.app https://i.scdn.co https://*.scdn.co https://*.spotifycdn.com https://mosaic.scdn.co https://*.spotify.com https://*.googleusercontent.com https://googleusercontent.com https://*.google.com https://*.gstatic.com https://demotiles.maplibre.org https://*.maplibre.org https://fonts.openmaptiles.org; font-src 'self' data: https://fonts.gstatic.com https://fonts.openmaptiles.org; connect-src 'self' https://*.clerk.accounts.dev https://clerk.com https://*.clerk.com https://clerk.bokra101.vercel.app https://bokra101.vercel.app https://api.clerk.com https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://server.arcgisonline.com https://*.basemaps.cartocdn.com https://basemaps.cartocdn.com https://*.openfreemap.org https://tiles.openfreemap.org https://fcmregistrations.googleapis.com https://firebaseinstallations.googleapis.com https://*.googleapis.com https://*.firebaseio.com https://api.spotify.com https://*.upstash.io wss://*.upstash.io https://accounts.google.com https://*.protect.clerk.com:* https://clerk-telemetry.com https://*.clerk-telemetry.com; frame-src 'self' https://open.spotify.com https://*.clerk.accounts.dev https://clerk.com https://clerk.bokra101.vercel.app https://bokra101.vercel.app https://accounts.google.com; worker-src 'self' blob: https://bokra101.vercel.app; child-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self' https://accounts.google.com https://*.clerk.accounts.dev https://clerk.com https://*.clerk.com https://clerk.bokra101.vercel.app; frame-ancestors 'self';" },
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
