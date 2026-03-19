import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  async redirects() {
    return [
      { source: "/member", destination: "/", permanent: false },
      { source: "/member/:path*", destination: "/:path*", permanent: false },
      { source: "/app", destination: "/admin", permanent: false },
      { source: "/app/:path*", destination: "/admin/:path*", permanent: false },
      { source: "/auth/login", destination: "/login", permanent: false },
      { source: "/auth/sign-up", destination: "/sign-up", permanent: false },
      { source: "/auth/forgot-password", destination: "/forgot-password", permanent: false },
      { source: "/auth/update-password", destination: "/update-password", permanent: false },
    ];
  },
};

export default nextConfig;
