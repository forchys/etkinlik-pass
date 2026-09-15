import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import FloatingSurveyButton from "./components/FloatingSurveyButton";

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
  metadataBase: new URL('https://flickbilet.vercel.app'), 
  openGraph: {
    title: "Flick Bilet",
    description: "Ankara Medipol Sinema ve Tiyatro Topluluğu Bilet Sistemi",
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
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#e2e8f0] text-[#1e1b4b] overflow-x-hidden selection:bg-[#facc15] selection:text-[#1e1b4b]">
        {/* Sayfa içerikleri (page.tsx) */}
        {children}

        {/* 
          YÜZEN ANKET BUTONU (MEMPHIS POP-ART CONTAINER WRAPPER)
          FloatingSurveyButton bileşenine sert pop-art gölge ve eğim katar.
        */}
        <div className="fixed bottom-6 right-6 z-50 transform hover:scale-105 active:scale-95 transition-all">
          <div className="relative">
            {/* Arka Kırmızı Pop-Art Vurgu Gölgesi */}
            <div className="absolute top-1 left-1 right--1 bottom--1 bg-[#ef4444] rounded-2xl border-2 border-[#1e1b4b] -z-10" />
            
            {/* Anket Butonu Kutusu */}
            <div className="bg-[#facc15] border-2 border-[#1e1b4b] rounded-2xl p-1 shadow-[3px_3px_0px_#1e1b4b] -rotate-2">
              <FloatingSurveyButton />
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
