import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import {SessionProvider} from "next-auth/react";
import {auth} from "@/auth"
import { ThemeProvider } from "@/components/providers/theme-providers";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Workbench",
  description: "Workbench is a powerful developer workspace built to help you build, debug, test, and ship software faster. Bring your tools, workflows, and intelligent development capabilities together in one seamless environment.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth()
  return (
    <SessionProvider session={session}>
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
         <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <div className="flex flex-col min-h-screen">
              <Toaster/>
              <div className="flex-1">
                {children}

              </div>

            </div>
            
        
        </ThemeProvider>
      </body>
    </html>
    </SessionProvider>
  );
}