import type { Metadata, Viewport } from "next";
import { Poppins, Silkscreen } from "next/font/google";
import "./globals.css";
import AppProviders from "@/components/providers/AppProviders";
import AppShell from "@/components/layout/AppShell";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const silkscreen = Silkscreen({
  variable: "--font-silkscreen",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://veritymarket.vercel.app"),
  title: "Verity World Cup | Every Result Settled on Proof",
  description:
    "A social World Cup prediction arena powered by live TxLINE data and verifiable settlement on Solana.",
  applicationName: "Verity World Cup",
  keywords: [
    "Verity",
    "prediction markets",
    "World Cup markets",
    "TxLINE",
    "Solana",
    "USDC",
    "community signals",
  ],
  icons: {
    icon: [{ url: "/icon", sizes: "64x64", type: "image/png" }],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Verity World Cup | Every Result Settled on Proof",
    description:
      "Back live World Cup predictions and verify every settlement against TxLINE proofs on Solana.",
    url: "https://veritymarket.vercel.app",
    siteName: "Verity",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Verity World Cup prediction markets preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Verity World Cup | Every Result Settled on Proof",
    description:
      "A social World Cup prediction arena with verifiable settlement on Solana.",
    images: ["/twitter-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${poppins.variable} ${silkscreen.variable}`}
      suppressHydrationWarning
    >
      <body
        className="game-app min-h-screen overflow-y-scroll bg-background text-foreground"
        suppressHydrationWarning
      >
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
