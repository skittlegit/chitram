import type { Metadata } from "next";
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
  title: "Chitram — The Telugu Cinema Guessing Game",
  description: "Guess Telugu films across three cinematic game formats, build your streak, explore the archive, and prove your Tollywood knowledge.",
  openGraph: {
    title: "Chitram — The Telugu Cinema Guessing Game",
    description: "Three game formats. Six cinematic clues. One mystery Telugu film.",
    type: "website",
    images: [{ url: "/og.png", width: 1730, height: 907, alt: "Chitram Telugu movie guessing game" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Chitram — The Telugu Cinema Guessing Game",
    description: "Three game formats. Six cinematic clues. One mystery Telugu film.",
    images: ["/og.png"],
  },
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
