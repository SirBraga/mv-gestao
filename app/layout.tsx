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
  metadataBase: new URL("https://mvdesk.mvmicro.com.br"),
  title: {
    default: "MV Desk | Sistema de Gestão e Helpdesk",
    template: "%s | MV Desk",
  },
  description: "Sistema de gestão e helpdesk da MV Automação para atendimento, clientes, contabilidade, produtos e operação interna.",
  keywords: [
    "MV Desk",
    "helpdesk",
    "sistema de gestão",
    "atendimento",
    "tickets",
    "clientes",
    "contabilidade",
    "produtos",
    "MV Automação",
  ],
  applicationName: "MV Desk",
  authors: [{ name: "MV Automação" }],
  creator: "MV Automação",
  publisher: "MV Automação",
  category: "business",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "MV Desk | Sistema de Gestão e Helpdesk",
    description: "Centralize clientes, tickets, produtos e a operação da sua empresa em um único sistema.",
    url: "/",
    siteName: "MV Desk",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MV Desk | Sistema de Gestão e Helpdesk",
    description: "Centralize clientes, tickets, produtos e a operação da sua empresa em um único sistema.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
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
