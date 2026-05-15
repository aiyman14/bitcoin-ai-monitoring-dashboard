import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { asyncBufferFromFile, parquetReadObjects } from "hyparquet";
import type { AssetConfig } from "./assets";
import {
	LOOKBACK_OPTIONS,
	type LookbackLabel,
	type PatternArtifact,
	type PatternArtifactsByLookback,
} from "./patterns";

export type SignalRegime = {
	label: string;
	trend_label: string;
	volatility_percentile: number | null;
	window_hours: number;
};

export type SignalArtifact = {
	as_of: string | null;
	asset: string;
	direction: "down" | "unavailable" | "up";
	model: string;
	probability_up: number | null;
	regime?: SignalRegime;
	test_f1: number | null;
};

export type HourlyRow = {
	close: number;
	openTime: string;
	volume: number;
};

export type PriceSnapshot = {
	asOf: string;
	change24h: number | null;
	dateSpan: {
		end: string;
		start: string;
	};
	latestClose: number;
	previousClose: number | null;
	rows: number;
};

export async function readAssetJson<T>(
	asset: AssetConfig,
	fileName: string,
): Promise<T | null> {
	try {
		const raw = await readFile(
			join(process.cwd(), "data", asset.id, fileName),
			"utf8",
		);
		return JSON.parse(raw) as T;
	} catch {
		return null;
	}
}

export function readPatternArtifact(
	asset: AssetConfig,
): Promise<PatternArtifact | null> {
	return readAssetJson<PatternArtifact>(asset, "pattern_top_k_24h.json");
}

export async function readPatternArtifacts(
	asset: AssetConfig,
): Promise<PatternArtifactsByLookback> {
	const entries = await Promise.all(
		LOOKBACK_OPTIONS.map(async ({ value }) => [
			value,
			await readAssetJson<PatternArtifact>(
				asset,
				`pattern_top_k_${value}.json`,
			),
		]),
	);
	return Object.fromEntries(
		entries.filter((entry): entry is [LookbackLabel, PatternArtifact] => {
			return entry[1] !== null;
		}),
	);
}

export function readSignalArtifact(
	asset: AssetConfig,
): Promise<SignalArtifact | null> {
	return readAssetJson<SignalArtifact>(asset, "signal.json");
}

export async function readHourlyRows(asset: AssetConfig): Promise<HourlyRow[]> {
	try {
		const file = await asyncBufferFromFile(
			join(process.cwd(), "data", asset.id, "hourly.parquet"),
		);
		const rawRows: Record<string, unknown>[] = await parquetReadObjects({
			columns: ["open_time", "close", "volume"],
			file,
		});
		return rawRows
			.map((row) => toHourlyRow(row))
			.filter((row): row is HourlyRow => row !== null)
			.sort((a, b) => Date.parse(a.openTime) - Date.parse(b.openTime));
	} catch {
		return [];
	}
}

export function summarizePrice(rows: HourlyRow[]): PriceSnapshot | null {
	if (rows.length === 0) {
		return null;
	}

	const latest = rows[rows.length - 1];
	const targetTime = Date.parse(latest.openTime) - 24 * 60 * 60 * 1000;
	const previous =
		[...rows].reverse().find((row) => Date.parse(row.openTime) <= targetTime) ??
		null;
	return {
		asOf: latest.openTime,
		change24h: previous ? latest.close / previous.close - 1 : null,
		dateSpan: {
			end: latest.openTime,
			start: rows[0].openTime,
		},
		latestClose: latest.close,
		previousClose: previous?.close ?? null,
		rows: rows.length,
	};
}

function toHourlyRow(row: Record<string, unknown>): HourlyRow | null {
	const openTime = toIsoString(row.open_time);
	const close = toNumber(row.close);
	const volume = toNumber(row.volume);
	if (openTime === null || close === null || volume === null) {
		return null;
	}
	return { close, openTime, volume };
}

function toIsoString(value: unknown): string | null {
	if (value instanceof Date) {
		return value.toISOString();
	}
	if (typeof value === "string") {
		const timestamp = new Date(value);
		return Number.isNaN(timestamp.valueOf()) ? null : timestamp.toISOString();
	}
	return null;
}

function toNumber(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === "bigint") {
		return Number(value);
	}
	return null;
}
