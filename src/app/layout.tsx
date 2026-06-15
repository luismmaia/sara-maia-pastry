import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sara Maia · Pastry",
  description: "Bolos por encomenda, com levantamento marcado. Maia · Porto.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500&family=Cormorant+Garamond:ital,wght@0,400;1,400;1,500&family=Inter:wght@300;400;500&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
