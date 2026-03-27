import type { Metadata } from "next";
import "./globals.css";
import { CloudscapeProvider } from "@/components/CloudscapeProvider";
import { CloudscapeLayout } from "@/components/layout/CloudscapeLayout";

export const metadata: Metadata = {
  title: "AI-Crew UI",
  description: "Design and Configuration Visualization Tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <CloudscapeProvider>
          <CloudscapeLayout>{children}</CloudscapeLayout>
        </CloudscapeProvider>
      </body>
    </html>
  );
}
