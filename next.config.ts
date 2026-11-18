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

/**
 * Cabeçalhos de segurança em todas as páginas (issue #8):
 * - nosniff: o navegador não "adivinha" o tipo de um arquivo;
 * - Referrer-Policy: outros sites não recebem o endereço completo da página
 *   (que pode ter filtros ou ids);
 * - frame-ancestors 'none' / X-Frame-Options: nenhum site coloca o painel
 *   dentro de um iframe para enganar o corretor (clickjacking);
 * - Permissions-Policy: câmera, microfone e localização desligados.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false, // não anuncia "Next.js" em cada resposta
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
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
