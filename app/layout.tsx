import type { Metadata } from "next";
import { ASSETS } from "@/lib/assets";
import "./globals.css";

const defaultAsset = ASSETS.find((asset) => asset.enabled) ?? ASSETS[0];

export const metadata: Metadata = {
  title: `${defaultAsset.displayName} Market Monitor - A Responsible AI Dashboard`,
  description: "Pattern recognition with measured ranges."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
