import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Estatio – AI-driven objektmarknadsföring",
  description: "Generera professionella objekttexter för alla kanaler på sekunder.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body className="antialiased bg-[#111111] text-[#f0ece4]">
        {children}
      </body>
    </html>
  );
}
