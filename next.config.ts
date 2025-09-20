import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // صور YouTube thumbnails
      { protocol: "https", hostname: "img.youtube.com", pathname: "/**" },
      { protocol: "https", hostname: "i.ytimg.com",  pathname: "/**" },

      // محلي أثناء التطوير
      { protocol: "http", hostname: "localhost", port: "3000", pathname: "/uploads/**" },

      // Cloudinary
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
