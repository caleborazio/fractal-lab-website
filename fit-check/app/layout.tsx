import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkEnabled } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mind the Fit — Fractal Lab",
  description:
    "Check a secondhand or vintage listing and find out if it'll actually fit you.",
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
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Archivo+Narrow:wght@500;600&family=Caveat:wght@500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
  return clerkEnabled ? <ClerkProvider>{inner}</ClerkProvider> : inner;
}
