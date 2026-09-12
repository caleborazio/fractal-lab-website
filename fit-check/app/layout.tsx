import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkEnabled } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mind the Fit — Fractal Lab",
  description:
    "Upload a secondhand or vintage listing and find out if it'll actually fit you.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const inner = (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,500&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
  return clerkEnabled ? <ClerkProvider>{inner}</ClerkProvider> : inner;
}
