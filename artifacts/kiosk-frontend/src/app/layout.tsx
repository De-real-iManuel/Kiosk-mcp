import type { Metadata } from "next";
import { Toaster } from "sonner";
import { Providers } from "./providers";
import "@/index.css";

export const metadata: Metadata = {
  title: "Kiosk - Local businesses, discoverable by AI",
  description:
    "Make your business easier for AI assistants to find and understand. Create a structured business profile with Kiosk, no code required.",
  applicationName: "Kiosk",
  openGraph: {
    title: "Kiosk - Local businesses, discoverable by AI",
    description: "A simple way for independent businesses to share structured information with compatible AI assistants.",
    siteName: "Kiosk",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kiosk - Local businesses, discoverable by AI",
    description: "Make your business easier for AI assistants to find and understand.",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="dark">
        <Providers>{children}</Providers>
        <Toaster
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast:
                "bg-[#1C1A16] text-[#EDE7DC] border border-white/10 rounded-none shadow-none font-sans text-[13px]",
              success: "!bg-[#1C1A16]",
              error: "!bg-[#1C1A16]",
            },
          }}
        />
      </body>
    </html>
  );
}
