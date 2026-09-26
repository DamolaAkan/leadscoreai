/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // The solar funnel lives at /solar (custom design + hard gates). The
      // standard renderer at /leadscoreai/solar is retired — send it to /solar.
      {
        source: "/leadscoreai/solar",
        destination: "/solar",
        permanent: true,
      },
      // The builder landing moved to the home page (industry pages stay at /build/<industry>).
      { source: "/build", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
