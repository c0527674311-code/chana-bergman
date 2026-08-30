import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // These live as homepage sections, not separate pages.
      { source: "/about", destination: "/#about", permanent: true },
      { source: "/testimonials", destination: "/#testimonials", permanent: true },
      { source: "/how-it-works", destination: "/#how-it-works", permanent: true },
      { source: "/contact", destination: "/#contact", permanent: true },
      // Old-site route for the employers page.
      { source: "/mainEmployers", destination: "/employers", permanent: true },
    ];
  },
};

export default nextConfig;
