import { networkInterfaces } from "node:os";

import type { NextConfig } from "next";

/**
 * IPs desta máquina na rede local (ex.: 192.168.0.5), descobertos na hora.
 * Em desenvolvimento, o Next.js só entrega os arquivos de dev para localhost;
 * liberar estes IPs permite testar no celular pela mesma Wi-Fi
 * (http://<ip>:3000). Não afeta produção.
 */
function localNetworkIPs(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((net) => net?.family === "IPv4" && !net.internal)
    .map((net) => net!.address);
}

const nextConfig: NextConfig = {
  allowedDevOrigins: localNetworkIPs(),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
