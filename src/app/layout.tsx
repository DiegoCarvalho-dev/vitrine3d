import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { connection } from "next/server";

import { Toaster } from "@/components/ui/sonner";

import { siteUrl } from "@/lib/site-url";

import "./globals.css";

// Archivo variável com eixo de largura (wdth): texto em largura normal,
// títulos mais largos com a classe font-stretch-*.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

// Absolute links (WhatsApp preview): own domain, Vercel or localhost.

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: "Vitrine 3D",
  description:
    "Tours 3D interativos para corretores de imóveis: prédio, unidade e captação de leads em um link.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Every page is rendered per request, so each one gets a fresh CSP nonce
  // (src/proxy.ts, issue #86). A page built ahead of time would carry
  // scripts without the nonce, and the browser would block them.
  await connection();
  return (
    <html lang="pt-BR" className={`${archivo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <Toaster theme="light" position="top-center" />
      </body>
    </html>
  );
}
