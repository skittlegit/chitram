import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Chitram — The Daily Telugu Movie Riddle",
  description: "Guess a Telugu film from clues across eras of Tollywood cinema.",
  openGraph: {
    title: "Chitram — The Daily Telugu Movie Riddle",
    description: "Guess a Telugu film from clues across eras of Tollywood cinema.",
    type: "website",
    images: [{ url: "/og.png", width: 1730, height: 907, alt: "Chitram Telugu movie guessing game" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Chitram — The Daily Telugu Movie Riddle",
    description: "Guess a Telugu film from clues across eras of Tollywood cinema.",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
