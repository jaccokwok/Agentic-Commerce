import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle (`.next/standalone`) that the Docker
  // image can run without the full node_modules tree.
  output: "standalone",
};

export default nextConfig;
