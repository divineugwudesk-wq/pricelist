import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: {
    default: "PRICELIST — your prices on one link",
    template: "%s | PRICELIST",
  },
  description:
    "Put your products and prices on one link. Share it on WhatsApp, Instagram or a flyer, and take orders without building a website.",
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  keywords: [
    "price list",
    "WhatsApp business",
    "storefront",
    "Nigeria",
    "online store",
    "catalogue",
    "order on WhatsApp",
  ],
  openGraph: {
    type: "website",
    siteName: "PRICELIST",
    title: "PRICELIST — your prices on one link",
    description:
      "Put your products and prices on one link. Share it on WhatsApp, Instagram or a flyer, and take orders without building a website.",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0B2136",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-NG">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Loaded at runtime rather than build time — if the network is
            unavailable, the system stack in globals.css takes over. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap"
        />
      </head>
      <body className="font-sans antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
