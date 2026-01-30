/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Handle raw .graphql file imports
    config.module.rules.push({
      test: /\.graphql$/,
      type: "asset/source",
    });
    return config;
  },
};

module.exports = nextConfig;
