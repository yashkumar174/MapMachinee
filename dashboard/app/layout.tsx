import type { Metadata } from "next";
import localFont from "next/font/local";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import ThemeProvider from "../components/ThemeProvider";
import AuthProvider from "../components/AuthProvider";
import "./globals.css";

const stardomFont = localFont({
  src: "./fonts/Stardom-Regular.woff2",
  variable: "--font-stardom",
  weight: "400",
  display: "swap",
});

const erodeFont = localFont({
  src: "./fonts/Erode-Variable.woff2",
  variable: "--font-erode",
  weight: "300 700",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "MAPMACHINE — CRM",
  description: "Scrape, score, and pipeline your hyper-local leads with AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${stardomFont.variable} ${erodeFont.variable} ${geistMono.variable} ${geist.variable} ${instrumentSerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <AuthProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
