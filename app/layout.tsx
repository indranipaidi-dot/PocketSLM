import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PocketSLM Console",
  description: "Train a compact knowledge chatbot and use it through GET and POST APIs.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
