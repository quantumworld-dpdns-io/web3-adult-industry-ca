import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CA Dashboard",
  description: "Web3 Adult Industry Certification Authority Admin Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Sidebar />
        <main className="ml-64 min-h-screen p-8">{children}</main>
        <Toaster position="bottom-right" theme="dark" />
      </body>
    </html>
  );
}
