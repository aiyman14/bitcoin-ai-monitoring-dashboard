from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class AssetConfig:
    id: str
    binance_symbol: str
    yahoo_symbol: str
    display_name: str
    accent_color: str
    enabled: bool
    tableau_workbook_url: str = ""


def load_assets(repo_root: Path | None = None) -> list[AssetConfig]:
    root = repo_root or Path(__file__).resolve().parents[1]
    with (root / "lib" / "assets.json").open(encoding="utf-8") as handle:
        raw = json.load(handle)
    return [
        AssetConfig(
            id=item["id"],
            binance_symbol=item["binanceSymbol"],
            yahoo_symbol=item["yahooSymbol"],
            display_name=item["displayName"],
            accent_color=item["accentColor"],
            enabled=bool(item["enabled"]),
            tableau_workbook_url=item.get("tableauWorkbookUrl", ""),
        )
        for item in raw
    ]


def enabled_assets(repo_root: Path | None = None) -> list[AssetConfig]:
    return [asset for asset in load_assets(repo_root) if asset.enabled]
