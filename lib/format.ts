export function formatPercent(value: number, digits = 1): string {
	return `${(value * 100).toFixed(digits)}%`;
}

export function formatSignedPercent(value: number, digits = 1): string {
	const formatted = formatPercent(value, digits);
	return value > 0 ? `+${formatted}` : formatted;
}

export function formatNumber(value: number, digits = 2): string {
	return new Intl.NumberFormat("en-US", {
		maximumFractionDigits: digits,
		minimumFractionDigits: digits,
	}).format(value);
}

export function formatCurrency(value: number): string {
	return new Intl.NumberFormat("en-US", {
		currency: "USD",
		maximumFractionDigits: 2,
		minimumFractionDigits: 2,
		style: "currency",
	}).format(value);
}

export function formatDate(value: string): string {
	return new Intl.DateTimeFormat("en-US", {
		day: "numeric",
		month: "short",
		timeZone: "UTC",
		year: "numeric",
	}).format(new Date(value));
}

export function formatDateTime(value: string): string {
	return new Intl.DateTimeFormat("en-US", {
		day: "numeric",
		hour: "numeric",
		hour12: false,
		minute: "2-digit",
		month: "short",
		timeZone: "UTC",
		timeZoneName: "short",
		year: "numeric",
	}).format(new Date(value));
}

export function formatProbability(value: number | null): string {
	return value === null ? "unavailable" : value.toFixed(2);
}
