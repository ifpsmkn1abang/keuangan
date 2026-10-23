import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ruang Arus | Keuangan pribadi",
  description: "Kelola pemasukan, pengeluaran, dan kebiasaan finansial Anda.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}