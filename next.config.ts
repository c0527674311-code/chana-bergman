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
      // Routes of the previous (Angular) site, mapped from its router config,
      // so indexed links and bookmarks land on the equivalent page.
      { source: "/home", destination: "/", permanent: true },
      { source: "/home/:fragment", destination: "/", permanent: true },
      { source: "/uploade-cv", destination: "/submit-cv", permanent: true },
      { source: "/uploade-cv/:id", destination: "/submit-cv", permanent: true },
      { source: "/cv", destination: "/submit-cv", permanent: true },
      { source: "/cv/:id", destination: "/submit-cv", permanent: true },
      { source: "/candidate", destination: "/submit-cv", permanent: true },
      { source: "/candidate-referrals", destination: "/", permanent: true },
      { source: "/signup", destination: "/register", permanent: true },
      { source: "/reset-password", destination: "/login", permanent: true },
      { source: "/contact-section", destination: "/#contact", permanent: true },
      { source: "/steps-section", destination: "/#how-it-works", permanent: true },
      // Old back-office routes → the new admin.
      { source: "/filter", destination: "/admin/match", permanent: true },
      { source: "/users", destination: "/admin/candidates", permanent: true },
      { source: "/profileMenger", destination: "/admin", permanent: true },
      { source: "/editCanidate", destination: "/admin/candidates", permanent: true },
      { source: "/candidate-update/:id", destination: "/admin/candidates", permanent: true },
    ];
  },
};

export default nextConfig;
