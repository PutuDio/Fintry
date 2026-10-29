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
  title: "Fintry — Kelola Keuangan Pribadi via Chat",
  description:
    "Catat pemasukan, pengeluaran, transfer, dan investasi lewat percakapan bahasa Indonesia.",
  icons: [
    { rel: "icon", url: "/Icon.svg" },
  ],
  openGraph: {
    title: "Fintry — Kelola Keuangan Pribadi via Chat",
    description:
      "Catat pemasukan, pengeluaran, transfer, dan investasi lewat percakapan bahasa Indonesia.",
    images: ["/og.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fintry — Kelola Keuangan Pribadi via Chat",
    description:
      "Catat pemasukan, pengeluaran, transfer, dan investasi lewat percakapan bahasa Indonesia.",
    images: ["/og.png"],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#0B1F3B] text-[#F2F5F8]">{children}</body>
    </html>
  );
}