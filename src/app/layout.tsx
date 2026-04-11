import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project Kilometer",
  description: "Running training analysis and visualization",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50 font-sans">
        {children}
      </body>
    </html>
  );
}
