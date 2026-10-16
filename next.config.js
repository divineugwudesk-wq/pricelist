/** @type {import('next').NextConfig} */
const webpack = require("webpack");
const path = require("path");

const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: require.resolve("crypto-browserify"),
        stream: require.resolve("stream-browserify"),
        http: require.resolve("stream-http"),
        https: require.resolve("https-browserify"),
        buffer: require.resolve("buffer"),
        process: require.resolve("./lib/process-shim.js"),
        zlib: require.resolve("browserify-zlib"),
        querystring: require.resolve("querystring-es3"),
        url: require.resolve("./lib/url-shim.js"),
        assert: require.resolve("assert/"),
        events: require.resolve("events/"),
        vm: require.resolve("vm-browserify"),
      };
      config.resolve.alias = {
        ...config.resolve.alias,
        util: require.resolve("./lib/util-shim.js"),
      };
      config.plugins.push(
        new webpack.ProvidePlugin({
          process: require.resolve("./lib/process-shim.js"),
          Buffer: ["buffer", "Buffer"],
        })
      );
    }
    return config;
  },
};

module.exports = nextConfig;
