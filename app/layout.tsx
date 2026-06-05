import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: { default: "Le bazar de Laura", template: "%s" },
  description:
    "Ma collection de livres français d'occasion à Bangkok, que je fais circuler. Un titre te plaît ? Écris-moi, on s'arrange.",
  applicationName: "Le bazar de Laura",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Bazar Admin" },
};

export const viewport: Viewport = {
  themeColor: "#ad4a2b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${inter.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
