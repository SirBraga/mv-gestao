import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "./components/toast-provider";
import { QueryProvider } from "./providers/query-provider";
import { NavigationLoader } from "./providers/navigation-loader";

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
        <QueryProvider>
          <NavigationLoader />
          <ToastProvider />
          <div className="min-h-screen flex-1">
            {children}
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
