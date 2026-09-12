import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Go with Flow",
  description:
    "Daily task manager, DSA streak tracker, and life command center",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-zinc-950 text-zinc-100 antialiased min-h-screen">
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            try {
              const mode = localStorage.getItem("streakflow_theme_mode") || "dark";
              const accent = localStorage.getItem("streakflow_accent_color") || "emerald";
              document.documentElement.className = mode;
              document.documentElement.setAttribute("data-theme", mode);
              document.documentElement.setAttribute("data-accent", accent);
            } catch (e) {}
          `}
        </Script>
        {children}
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
