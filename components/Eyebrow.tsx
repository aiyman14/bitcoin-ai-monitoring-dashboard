import type { ReactNode } from "react";

export function Eyebrow({ children }: { children: ReactNode }) {
	return (
		<p className="eyebrow">
			<span aria-hidden="true" className="eyebrow-dot" />
			{children}
		</p>
	);
}
