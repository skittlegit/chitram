import type { Metadata, Viewport } from "next";
import { Anek_Telugu, Yatra_One } from "next/font/google";
import "./globals.css";

const anek = Anek_Telugu({
  variable: "--font-sans",
  subsets: ["latin", "telugu"],
  weight: "variable",
  axes: ["wdth"],
});

const yatra = Yatra_One({
  variable: "--font-wordmark",
  subsets: ["latin"],
  weight: "400",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Chitram — The Telugu Cinema Guessing Game", template: "%s | Chitram" },
  description: "Guess a Telugu film, spend points on optional clues, build your streak, and explore previous daily games.",
  applicationName: "Chitram",
  alternates: { canonical: "/" },
  category: "game",
  keywords: ["Telugu movies", "Tollywood", "movie guessing game", "daily game", "Telugu cinema"],
  formatDetection: { telephone: false },
  openGraph: {
    title: "Chitram — The Telugu Cinema Guessing Game",
    description: "One mystery Telugu film. Every guess and clue counts.",
    type: "website",
    images: [{ url: "/og.png", width: 1730, height: 907, alt: "Chitram Telugu movie guessing game" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Chitram — The Telugu Cinema Guessing Game",
    description: "One mystery Telugu film. Every guess and clue counts.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
  themeColor: "#12100f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${anek.variable} ${yatra.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
