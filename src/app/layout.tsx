import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AEGIS Monitor — AI Global Intelligence Platform",
  description: "AI-powered global open source intelligence collection and situation monitoring platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
