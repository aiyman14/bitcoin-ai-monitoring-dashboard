import type { Config } from "tailwindcss";

const config: Config = {
	content: [
		"./app/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./lib/**/*.{ts,tsx}",
	],
	theme: {
		extend: {
			colors: {
				background: "#fafaf7",
				bitcoin: {
					50: "#fff5e6",
					100: "#ffe2b8",
					500: "#f7931a",
					600: "#e07a00",
					900: "#5a2e00",
				},
				border: "#e8e7e1",
				foreground: "#1c1a17",
				muted: "#3d3a36",
				negative: "#b8453d",
				positive: "#1a7f5a",
				surface: {
					50: "#fafaf7",
					100: "#f3f3ef",
					200: "#e8e7e1",
					700: "#3d3a36",
					900: "#1c1a17",
				},
			},
			fontFamily: {
				sans: [
					"Inter",
					"ui-sans-serif",
					"system-ui",
					"-apple-system",
					"BlinkMacSystemFont",
					"Segoe UI",
					"sans-serif",
				],
			},
		},
	},
	plugins: [],
};

export default config;
