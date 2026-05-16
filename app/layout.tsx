import { ASSETS } from "@/lib/assets";
import type { Metadata } from "next";
import "./globals.css";

const defaultAsset = ASSETS.find((asset) => asset.enabled) ?? ASSETS[0];

export const metadata: Metadata = {
	title: `${defaultAsset.displayName} Market Monitor`,
	description: `A dashboard built to help you make sense of what ${defaultAsset.displayName} is doing right now. Instead of trying to predict where the market is going, it compares today's patterns to similar moments in the past and shows you what tended to happen afterward, so you can interpret today's market with real historical context.`,
};

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en">
			<head>
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link
					rel="preconnect"
					href="https://fonts.gstatic.com"
					crossOrigin="anonymous"
				/>
				<link
					href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap"
					rel="stylesheet"
				/>
			</head>
			<body>{children}</body>
		</html>
	);
}
