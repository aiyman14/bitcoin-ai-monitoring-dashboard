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
				// page + surfaces
				background: "#1a1a1f",
				panel: "#25252c",
				"panel-2": "#2f2f37",
				"panel-3": "#1f1f25",

				// borders
				border: "#3a3a44",
				"border-strong": "#54545f",

				// type, off-white scale on dark
				foreground: "#f5f5f0",
				"text-2": "#b8b6b0",
				"text-3": "#7c7a76",

				// kept for backwards compatibility with existing imports
				muted: "#b8b6b0",
				surface: {
					50: "#1a1a1f",   // page bg
					100: "#1f1f25",  // recessed
					200: "#3a3a44",  // borders
					700: "#b8b6b0",  // secondary text
					900: "#f5f5f0",  // primary text
				},

				// bitcoin orange, tactical accent only
				bitcoin: {
					50: "rgba(247, 147, 26, 0.06)",
					100: "rgba(247, 147, 26, 0.14)",
					500: "#F7931A",
					600: "#c87714",
					900: "#5a2e00",
				},

				// state colors, kept as-is per the brief
				positive: "#1a7f5a",
				negative: "#b8453d",
				"positive-fg": "#4dc28a",
				"negative-fg": "#e88880",
			},
			fontFamily: {
				display: [
					"Space Grotesk",
					"Inter",
					"ui-sans-serif",
					"system-ui",
					"sans-serif",
				],
				sans: [
					"Inter",
					"ui-sans-serif",
					"system-ui",
					"-apple-system",
					"BlinkMacSystemFont",
					"Segoe UI",
					"sans-serif",
				],
				mono: [
					"JetBrains Mono",
					"ui-monospace",
					"SFMono-Regular",
					"Menlo",
					"Monaco",
					"monospace",
				],
			},
			boxShadow: {
				comic: "5px 5px 0 #54545f",
				"comic-sm": "3px 3px 0 #54545f",
				"comic-bitcoin": "3px 3px 0 #c87714",
			},
			borderRadius: {
				panel: "4px",
			},
		},
	},
	plugins: [],
};

export default config;
