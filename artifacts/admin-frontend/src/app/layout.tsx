import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kiosk Internal Operations",
  description: "Restricted Kiosk operations console.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
