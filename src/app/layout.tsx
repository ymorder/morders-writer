import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NEXUS // Autonomous SEO, GEO & Editorial Intelligence Studio",
  description:
    "Live Google News, Reddit & X (Twitter) grounded 9-stage SEO/GEO Writer and Priority-Ranked Agency Editor.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" style={{ backgroundColor: "#050507", color: "#f8fafc" }}>
      <body
        style={{ backgroundColor: "#050507", color: "#f8fafc" }}
        className="min-h-screen bg-[#050507] text-slate-100 antialiased selection:bg-indigo-500/30 selection:text-indigo-200"
      >
        {children}
      </body>
    </html>
  );
}
