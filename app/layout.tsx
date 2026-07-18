import type { Metadata } from "next";
import { headers } from "next/headers";
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

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const description =
    "A live demo that turns public salary postings into skill price, wage exposure, market heat maps, and a personal skill portfolio.";

  return {
    metadataBase: new URL(origin),
    title: "JOBSDAQ — The Market for Human Skills",
    description,
    icons: {
      icon: "/favicon.ico",
      shortcut: "/favicon.ico",
    },
    openGraph: {
      title: "JOBSDAQ — The Market for Human Skills",
      description,
      type: "website",
      url: origin,
      images: [
        {
          url: `${origin}/og.png`,
          width: 1672,
          height: 941,
          alt: "JOBSDAQ skill market terminal",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "JOBSDAQ — The Market for Human Skills",
      description,
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
