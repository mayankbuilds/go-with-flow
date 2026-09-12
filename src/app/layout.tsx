import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Go with Flow",
  description:
    "Daily task manager, DSA streak tracker, and life command center",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#09090b" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const mode = localStorage.getItem("streakflow_theme_mode") || "dark";
                const accent = localStorage.getItem("streakflow_accent_color") || "emerald";
                document.documentElement.className = mode;
                document.documentElement.setAttribute("data-theme", mode);
                document.documentElement.setAttribute("data-accent", accent);
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="bg-zinc-950 text-zinc-100 antialiased min-h-screen">
        {children}
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
