import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { InlineScript } from "@/components/theme/inline-script";
import { ThemeProvider, themeScript } from "@/components/theme/theme-provider";
import { freshStartScript } from "@/lib/data/store";
import { PRODUCT_NAME } from "@/lib/labels";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: PRODUCT_NAME, template: `%s · ${PRODUCT_NAME}` },
  description: "Portfolio performance, variance, and next actions for multifamily owners and asset managers.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <InlineScript html={freshStartScript} />
        <InlineScript html={themeScript} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
