import type { Metadata } from "next";
import Script from "next/script";
import { IBM_Plex_Mono, Manrope, Syne } from "next/font/google";
import { Toaster } from "sonner";
import { Providers } from "@/lib/providers";
import { Navigation } from "@/components/Navigation";
import { AppPathProvider } from "@/lib/appPath";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
  preload: false,
  fallback: ["sans-serif"],
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
  preload: false,
  fallback: ["sans-serif"],
});

const ibm = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm",
  display: "swap",
  preload: false,
  fallback: ["monospace"],
});

export const metadata: Metadata = {
  title: "VERIA — Verifiable intelligence for autonomous agents",
  description:
    "Verifiable intelligence for autonomous agents. VERIA registers agent identity and stake, records behavior, then uses MeTTa and Omega to approve, reject, or limit actions — and show exactly why.",
  icons: {
    icon: "/veria-logo.jpg",
    shortcut: "/veria-logo.jpg",
    apple: "/veria-logo.jpg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script src="/wallet-guard.js" strategy="beforeInteractive" />
      </head>
      <body className={`${syne.variable} ${manrope.variable} ${ibm.variable} font-sans antialiased min-h-screen bg-aegent-bg text-aegent-text`}>
        <Providers>
          <AppPathProvider>
            <div className="page-frame min-h-screen">
              <Navigation />
              <main className="w-full">{children}</main>
              <Toaster theme="light" position="bottom-right" richColors />
            </div>
          </AppPathProvider>
        </Providers>
      </body>
    </html>
  );
}
