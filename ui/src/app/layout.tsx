import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Sidebar } from "@/components/layout/Sidebar";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI-Crew Studio",
  description: "AI-Crew 프로젝트 관찰 도구",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <div className="app-shell xl:grid xl:grid-cols-[320px_minmax(0,1fr)]">
          <Sidebar />
          <main className="min-w-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
