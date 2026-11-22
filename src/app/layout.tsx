import type { Metadata } from "next";
import { Archivo } from "next/font/google";

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

// Absolute base for the preview images (WhatsApp needs full URLs).
// Absolute links (WhatsApp preview): own domain, Vercel or localhost.

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: "Vitrine 3D",
  description:
    "Tours 3D interativos para corretores de imóveis: prédio, unidade e captação de leads em um link.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${archivo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <Toaster theme="light" position="top-center" />
      </body>
    </html>
  );
}
