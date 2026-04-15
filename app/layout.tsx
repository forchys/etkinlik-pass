import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Flick Bilet",
  description: "Ankara Medipol Sinema ve Tiyatro Topluluğu Bilet Sistemi",
  metadataBase: new URL('https://flickbilet.vercel.app'), // Kendi vercel adresinle değiştir
  openGraph: {
    title: "Flick Bilet",
    description: "",
    images: [
      {
        url: '/opengraph-image.png',
        width: 300,
        height: 300,
        alt: 'Flick Bilet Logo',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
