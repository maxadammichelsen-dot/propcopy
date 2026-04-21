import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Estatio – AI-driven objektmarknadsföring",
  description: "Generera professionella objekttexter för alla kanaler på sekunder.",
  icons: {
    icon: '/favicon-b.svg',
    apple: '/favicon-b.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body className="antialiased bg-bg text-ink min-h-screen">
        {children}
      </body>
    </html>
  );
}
