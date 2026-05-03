import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.wasm": {
        loaders: [],
        as: "*.wasm",
      },
    },
  },
};

export default nextConfig;
