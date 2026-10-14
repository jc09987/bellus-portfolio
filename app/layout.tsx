import type { Metadata } from "next";
import { DM_Sans, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-display" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Bellus Lab · Staff concierge",
  description:
    "A staff concierge for a seeded beauty studio. Search, book, reschedule, and cancel, with a confirmation card before every write.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${dmSans.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
