import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import HotstarSidebar from "./ui/HotstarSidebar";
import BottomNav from "./ui/BottomNav";
import Footer from "./ui/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HubD4U — Cinematic Streaming & Media Discovery",
  description: "Browse and stream high-definition movies, series, and multi-provider content with fast playback and direct downloads.",
  keywords: ["streaming", "movies", "tv series", "cinema", "hubd4u", "watch online"],
  authors: [{ name: "HubD4U" }],
  openGraph: {
    title: "HubD4U — Cinematic Streaming & Media Discovery",
    description: "Browse and stream high-definition movies, series, and multi-provider content with fast playback and direct downloads.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#090a0e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body suppressHydrationWarning className={`${inter.variable} font-sans antialiased bg-[#090a0e] text-white selection:bg-[#38bdf8] selection:text-black min-h-screen`}>
        {/* Desktop Left-Rail Navigation */}
        <HotstarSidebar />
        
        {/* Main Content Area */}
        <div suppressHydrationWarning className="relative z-10 min-h-screen md:pl-18 transition-all duration-300">
          <main suppressHydrationWarning className="min-h-screen pb-20 md:pb-0">
            {children}
          </main>
          <Footer />
        </div>
        
        {/* Mobile Bottom Navigation */}
        <BottomNav />
        <Analytics />
      </body>
    </html>
  );
}
