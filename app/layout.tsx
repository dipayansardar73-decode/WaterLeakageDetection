import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Water Leakage Detection Systems",
  description: "Municipal water-distribution leakage detection and localisation dashboard.",
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
      <body className="antialiased">{children}</body>
    </html>
  );
}
