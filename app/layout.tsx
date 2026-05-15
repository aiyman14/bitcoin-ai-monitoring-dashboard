import { ASSETS } from "@/lib/assets";
import type { Metadata } from "next";
import "./globals.css";

const defaultAsset = ASSETS.find((asset) => asset.enabled) ?? ASSETS[0];

export const metadata: Metadata = {
	title: `${defaultAsset.displayName} Market Monitor`,
	description: `A tool that focuses on pattern recognition, not prediction. It compares today's ${defaultAsset.displayName} market patterns to similar moments in the past and shows what historically followed — as a range, not a guarantee.`,
};

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}
