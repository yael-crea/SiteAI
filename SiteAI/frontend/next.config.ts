import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "site-ai-jzjx.vercel.app" }],
        destination: "https://lumio.business/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;