import type { Metadata } from "next";
import { Urbanist, Schoolbell } from "next/font/google";
import { AuthProvider } from "../lib/auth-context";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const urbanist = Urbanist({
  variable: "--font-urbanist",
  subsets: ["latin"],
});

const schoolbell = Schoolbell({
  variable: "--font-schoolbell",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Mooma - Perjalanan Kehamilan yang Indah",
  description: "Platform terpercaya untuk mendampingi perjalanan kehamilan Anda",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${urbanist.variable} ${schoolbell.variable} font-sans antialiased`}
      >
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#fff',
                color: '#E26884',
                border: '1px solid #E26884',
              },
              success: {
                style: {
                  background: '#E26884',
                  color: '#fff',
                },
              },
              error: {
                style: {
                  background: '#ef4444',
                  color: '#fff',
                },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
