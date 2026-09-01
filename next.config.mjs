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
    ];
  },
};

export default nextConfig;
