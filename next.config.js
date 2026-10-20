/** @type {import('next').NextConfig} */
const webpack = require("webpack");

const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
  // The Prisma client is generated with `engineType = "client"`, which runs the
  // query compiler as WebAssembly. On Cloudflare Workers the client is
  // resolved through the "workerd" export condition and loads
  // `query_compiler_bg.wasm` with a dynamic import that Next's file tracing
  // cannot follow, so the runtime files are added explicitly.
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/.prisma/client/**/*",
      "./node_modules/@prisma/client/runtime/wasm-compiler-edge.*",
    ],
    "/api/:path*": [
      "./node_modules/.prisma/client/**/*",
      "./node_modules/@prisma/client/runtime/wasm-compiler-edge.*",
    ],
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
  webpack: (config, { isServer, nextRuntime }) => {
    if (isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: require.resolve("crypto-browserify"),
        stream: require.resolve("stream-browserify"),
        http: require.resolve("stream-http"),
        https: require.resolve("https-browserify"),
        buffer: require.resolve("buffer"),
        zlib: require.resolve("browserify-zlib"),
        querystring: require.resolve("querystring-es3"),
        url: require.resolve("./lib/url-shim.js"),
        assert: require.resolve("assert/"),
        events: require.resolve("events/"),
        vm: require.resolve("vm-browserify"),
      };
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ["buffer", "Buffer"],
        })
      );
      // The `process` and `util` shims exist for the edge runtime, where those
      // globals are not available. The Node server compilation resolves both to
      // the real builtins, and pointing them at a project file there makes
      // webpack treat the shim as a page entry (`Entry lib/process-shim depends
      // on main, but this entry was not found`), which breaks `next dev`.
      if (nextRuntime === "edge") {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          process: require.resolve("./lib/process-shim.js"),
        };
        config.resolve.alias = {
          ...config.resolve.alias,
          util: require.resolve("./lib/util-shim.js"),
        };
        config.plugins.push(
          new webpack.ProvidePlugin({
            process: require.resolve("./lib/process-shim.js"),
          })
        );
      }
    }
    return config;
  },
};

module.exports = nextConfig;
