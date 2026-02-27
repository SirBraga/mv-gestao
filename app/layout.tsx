import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "./components/toast-provider";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MV Gestão",
  description: "Sistema de gestão - MV Automação",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} antialiased`}>
        <ToastProvider />
        <div className="min-h-screen flex-1">
          {children}
        </div>
      </body>
    </html>
  );
}
