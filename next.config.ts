import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/transactions", destination: "/money?tab=transactions", permanent: false },
      { source: "/analytics", destination: "/money?tab=analytics", permanent: false },
      { source: "/planner", destination: "/budget?tab=plan", permanent: false },
      { source: "/tax", destination: "/bills?tab=tax", permanent: false },
      { source: "/subscriptions", destination: "/bills?tab=subscriptions", permanent: false },
      { source: "/splits", destination: "/bills?tab=splits", permanent: false },
      { source: "/financial-health", destination: "/goals?tab=health", permanent: false },
      { source: "/ai-insights", destination: "/ai?tab=reports", permanent: false },
      { source: "/agent", destination: "/ai?tab=chat", permanent: false },
      { source: "/learn", destination: "/ai?tab=learn", permanent: false },
    ];
  },
};

export default nextConfig;
