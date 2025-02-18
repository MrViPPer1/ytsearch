import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { RootLayout } from "@/components/layout/root-layout";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "YouTube Channel Search",
  description: "Search and analyze YouTube channels",
  icons: {
    icon: "/yt.ico",
  },
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <RootLayout>{children}</RootLayout>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
} 