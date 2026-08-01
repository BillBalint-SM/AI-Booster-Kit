import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Booster Kit — Build better with Agents",
  description:
    "A human-centered capability platform for choosing, shaping and using Agent and multi-Agent formations.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
