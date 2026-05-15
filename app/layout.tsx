import { ASSETS } from "@/lib/assets";
import type { Metadata } from "next";
import "./globals.css";

const defaultAsset = ASSETS.find((asset) => asset.enabled) ?? ASSETS[0];

export const metadata: Metadata = {
	title: `${defaultAsset.displayName} Market Monitor`,
	description: `A tool that focuses on pattern recognition, not prediction. It gives users more context for what ${defaultAsset.displayName} is doing right now by comparing today's market patterns to similar moments in the past — because past patterns can tell a story about what could happen next, shown as a range, not a guarantee.`,
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
