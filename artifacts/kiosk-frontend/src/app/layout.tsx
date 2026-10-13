import type { Metadata } from "next";
import { Toaster } from "sonner";
import { Providers } from "./providers";
import "@/index.css";

export const metadata: Metadata = {
  title: "Kiosk — Where agents come to buy",
  description:
    "Turn your business into an Agent Skill in 2 minutes. No code required.",
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
