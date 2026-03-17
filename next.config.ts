import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === "development",
  },

  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/interview/:path*",
        headers: [
          {
            key:   "Content-Security-Policy",
            value: "frame-src 'self' https://*.daily.co;",
          },
        ],
      },
    ]
  },

  experimental: {
    optimizePackageImports: [
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-avatar",
      "lucide-react",
      "recharts",
    ],
  },
}

export default nextConfig