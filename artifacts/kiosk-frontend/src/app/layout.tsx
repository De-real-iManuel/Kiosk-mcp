import type { Metadata } from 'next';
import { Providers } from './providers';
import '@/index.css';

export const metadata: Metadata = {
  title: 'Kiosk — Where agents come to buy',
  description:
    'Turn your business into an Agent Skill in 2 minutes. No code required.',
  icons: {
    icon: '/favicon.svg',
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
      </body>
    </html>
  );
}
