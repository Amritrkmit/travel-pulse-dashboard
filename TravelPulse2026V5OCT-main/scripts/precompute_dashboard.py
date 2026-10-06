#!/usr/bin/env python3
"""
Precompute Travel Pulse dashboard summaries.

Run from the project root:
    python scripts/precompute_dashboard.py

This reads the existing normalized record chunks in data/records-*.json and
writes small ready-to-render JSON files under data/precomputed/.
"""

from __future__ import annotations

import json
import math
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, MutableMapping, Sequence


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
OUT_DIR = DATA_DIR / "precomputed"

DIMENSIONS = [
    "Market",
    "Region",
    "Age Group",
    "Gender",
    "Income",
    "Children",
    "Marital Status",
    "Companion",
    "Trip Type",
    "Segment_Age",
    "Segment_Budget",
    "cabinClass",
    "accommodation",
]

TAB_QUESTIONS = {
    "source_market": [
        "planningStage",
        "tripPurpose",
        "tripTiming",
        "spendChange",
        "airlineNPS",
        "hotelNPS",
        "aiLikelihood",
        "cabinClass",
        "accommodation",
    ],
    "destination_market": ["Q3", "Q3a"],
    "travel_behaviour": [
        "planningStage",
        "tripPurpose",
        "tripTiming",
        "planningLeadTime",
        "travelCompanions",
        "bookingChannels",
        "decisionFactors",
        "experiences",
        "infoChannels",
        "spendChange",
        "aiLikelihood",
        "aiTasks",
        "Q3",
        "Q3a",
        "Q4",
        "Q5",
        "Q6",
        "Q6a",
        "Q8",
        "Q9",
        "Q9a",
        "Q9b",
        "Q9c",
        "Q10",
        "Q10a",
        "Q11",
        "Q11a",
        "Q12",
    ],
    "airline": [
        "airlineCarrier",
        "airlineConsiderations",
        "cabinClass",
        "airlineLoyaltyImportance",
        "airlineLoyaltyFeatures",
        "airlineStrategies",
        "airlineNPS",
        "Q14",
        "Q15",
        "Q15a",
        "Q16",
        "Q16a",
        "Q16b",
        "Q17",
    ],
    "hotels": [
        "accommodation",
        "hotelBrand",
        "hotelConsiderations",
        "hotelLoyaltyImportance",
        "hotelLoyaltyFeatures",
        "hotelStrategies",
        "hotelNPS",
        "Q19",
        "Q20",
        "Q21",
        "Q21a",
        "Q22",
        "Q22a",
        "Q22b",
        "Q23",
    ],
}


def clean(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and math.isnan(value):
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def normalize_dest(value: Any) -> str:
    s = clean(value)
    if not s:
        return ""
    lower = s.lower()
    aliases = {
        "usa": "United States",
        "us": "United States",
        "united states of america": "United States",
        "uk": "United Kingdom",
        "uae": "United Arab Emirates",
        "ksa": "Saudi Arabia",
        "south korea": "South Korea",
        "korea, republic of (south korea)": "South Korea",
    }
    return aliases.get(lower, s)


def as_list(value: Any) -> List[Any]:
    if value is None:
        return []
    if isinstance(value, float) and math.isnan(value):
        return []
    if isinstance(value, list):
        return [v for v in value if clean(v)]
    if isinstance(value, tuple):
        return [v for v in value if clean(v)]
    text = clean(value)
    return [text] if text else []


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )


def load_records() -> List[Dict[str, Any]]:
    manifest = read_json(DATA_DIR / "manifest.json")
    records: List[Dict[str, Any]] = []
    for rel in manifest.get("chunks", {}).get("records", {}).values():
        chunk = read_json(ROOT / rel)
        for row in chunk.get("records", chunk if isinstance(chunk, list) else []):
            records.append(row)
    return records


def load_bootstrap() -> Dict[str, Any]:
    return read_json(DATA_DIR / "bootstrap.json")


def group_key(kind: str, value: str) -> str:
    return f"{kind}::{value}" if value else "all"


def record_groups(row: Mapping[str, Any]) -> List[str]:
    groups = ["all"]
    for dim in DIMENSIONS:
        value = clean(row.get(dim))
        if value:
            groups.append(group_key(dim, value))
    return groups


def infer_question_type(key: str, bootstrap: Mapping[str, Any]) -> str:
    q = (bootstrap.get("questions") or {}).get(key) or {}
    qtype = q.get("type")
    if qtype:
        return qtype
    if key in {"airlineNPS", "hotelNPS", "Q15a", "Q21a"}:
        return "nps"
    return "multi"


def summarize_question(rows: Sequence[Mapping[str, Any]], key: str, bootstrap: Mapping[str, Any]) -> Dict[str, Any]:
    qtype = infer_question_type(key, bootstrap)
    base = len(rows)

    if key == "Q3":
        counts = Counter()
        total_responses = 0
        for row in rows:
            values = []
            for col in ("Q3_1", "Q3_2", "Q3_3"):
                v = normalize_dest(row.get(col))
                if v:
                    values.append(v)
            if not values:
                values = [normalize_dest(v) for v in as_list(row.get("Q3"))]
            for value in values:
                if value:
                    counts[value] += 1
                    total_responses += 1
        return {
            "type": "multi_response",
            "base": base,
            "answerBase": total_responses,
            "data": [
                {"label": label, "count": count, "value": count / total_responses if total_responses else 0}
                for label, count in counts.most_common()
            ],
        }

    if qtype == "nps":
        vals = []
        for row in rows:
            try:
                vals.append(float(row.get(key)))
            except (TypeError, ValueError):
                continue
        dist = Counter(int(v) for v in vals if 0 <= v <= 10 and float(v).is_integer())
        score = (
            sum(1 if v >= 9 else -1 if v <= 6 else 0 for v in vals) / len(vals) * 100
            if vals
            else 0
        )
        data = [{"label": str(i), "count": dist.get(i, 0), "value": dist.get(i, 0) / len(vals) if vals else 0} for i in range(11)]
        data.append({"label": "NPS Score", "count": len(vals), "value": score})
        return {"type": "nps", "base": base, "answerBase": len(vals), "data": data}

    counts = Counter()
    answer_base = 0
    for row in rows:
        values = as_list(row.get(key))
        if not values:
            continue
        if qtype == "multi":
            answer_base += 1
            for value in values:
                label = normalize_dest(value) if key in {"Q3", "Q3a"} else clean(value)
                if label:
                    counts[label] += 1
        else:
            label = normalize_dest(values[0]) if key in {"Q3", "Q3a"} else clean(values[0])
            if label:
                answer_base += 1
                counts[label] += 1

    denominator = answer_base or base or 1
    data = [
        {"label": label, "count": count, "value": count / denominator}
        for label, count in counts.most_common()
    ]

    if key in {"aiLikelihood", "airlineLoyaltyImportance", "hotelLoyaltyImportance"}:
        values = [clean(row.get(key)) for row in rows if clean(row.get(key))]
        denom = len(rows) or 1
        if key == "aiLikelihood":
            top = sum(v in {"Extremely likely", "Somewhat likely"} for v in values)
            bottom = sum(v in {"Somewhat unlikely", "Extremely unlikely"} for v in values)
            data.extend([
                {"label": "Top 2 Box", "count": top, "value": top / denom},
                {"label": "Bottom 2 Box", "count": bottom, "value": bottom / denom},
            ])
        else:
            top = sum(v in {"Extremely important", "Very important"} for v in values)
            bottom = sum(v in {"Slightly important", "Not at all important"} for v in values)
            data.extend([
                {"label": "NET : Top 2 Box", "count": top, "value": top / denom},
                {"label": "NET : Bottom 2 Box", "count": bottom, "value": bottom / denom},
            ])

    return {"type": qtype, "base": base, "answerBase": answer_base, "data": data}


def sentiment_score(pos: int, neg: int, total: int) -> float | None:
    if not total:
        return None
    return (pos - neg) / total * 100


def summarize_sentiment_items(rows: Sequence[Mapping[str, Any]], item_key: str, score_key: str) -> List[Dict[str, Any]]:
    items: Dict[str, Dict[str, int]] = defaultdict(lambda: {"positive": 0, "neutral": 0, "negative": 0, "total": 0})
    for row in rows:
        item = clean(row.get(item_key))
        if not item:
            continue
        try:
            score = float(row.get(score_key))
        except (TypeError, ValueError):
            continue
        bucket = "positive" if score >= 9 else "negative" if score <= 6 else "neutral"
        items[item][bucket] += 1
        items[item]["total"] += 1
    out = []
    for label, stats in items.items():
        total = stats["total"]
        out.append({
            "label": label,
            **stats,
            "score": sentiment_score(stats["positive"], stats["negative"], total),
        })
    return sorted(out, key=lambda x: (-x["total"], x["label"]))


def build_grouped_summaries(records: Sequence[Mapping[str, Any]], bootstrap: Mapping[str, Any], questions: Iterable[str]) -> Dict[str, Any]:
    grouped: Dict[str, List[Mapping[str, Any]]] = defaultdict(list)
    for row in records:
        for key in record_groups(row):
            grouped[key].append(row)

    summaries: Dict[str, Any] = {}
    for gkey, rows in grouped.items():
        summaries[gkey] = {
            "base": len(rows),
            "questions": {q: summarize_question(rows, q, bootstrap) for q in questions},
            "airlineItems": summarize_sentiment_items(rows, "airlineCarrier", "airlineNPS"),
            "hotelItems": summarize_sentiment_items(rows, "hotelBrand", "hotelNPS"),
        }
    return summaries


def build_filter_index(records: Sequence[Mapping[str, Any]], bootstrap: Mapping[str, Any]) -> Dict[str, Any]:
    options: Dict[str, set] = defaultdict(set)
    regions: Dict[str, set] = defaultdict(set)
    row_counts: Dict[str, int] = defaultdict(int)
    for idx, row in enumerate(records):
        del idx
        for dim in DIMENSIONS:
            value = clean(row.get(dim))
            if value:
                options[dim].add(value)
                row_counts[group_key(dim, value)] += 1
        row_counts["all"] += 1
        region = clean(row.get("Region"))
        market = clean(row.get("Market"))
        if region and market:
            regions[region].add(market)
    boot_options = bootstrap.get("filterOptions", {})
    for dim, values in boot_options.items():
        for value in values:
            options[dim].add(clean(value))
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "totalRows": len(records),
        "options": {k: sorted(v) for k, v in options.items()},
        "regions": {k: sorted(v) for k, v in sorted(regions.items())},
        "rowCounts": dict(row_counts),
    }


def build_tab_file(tab: str, records: Sequence[Mapping[str, Any]], bootstrap: Mapping[str, Any]) -> Dict[str, Any]:
    questions = TAB_QUESTIONS[tab]
    return {
        "tab": tab,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "totalRows": len(records),
        "questions": questions,
        "groups": build_grouped_summaries(records, bootstrap, questions),
    }


def update_manifest(precomputed_paths: Mapping[str, str]) -> None:
    manifest_path = DATA_DIR / "manifest.json"
    manifest = read_json(manifest_path)
    manifest["precomputed"] = dict(precomputed_paths)
    write_json(manifest_path, manifest)


def main() -> None:
    bootstrap = load_bootstrap()
    records = load_records()
    if not records:
        raise SystemExit("No records found. Check data/manifest.json record chunks.")

    precomputed_paths = {
        "filters": "data/precomputed/filters.json",
        "source_market": "data/precomputed/source_market.json",
        "destination_market": "data/precomputed/destination_market.json",
        "travel_behaviour": "data/precomputed/travel_behaviour.json",
        "airline": "data/precomputed/airline.json",
        "hotels": "data/precomputed/hotels.json",
    }

    write_json(ROOT / precomputed_paths["filters"], build_filter_index(records, bootstrap))
    for tab in ("source_market", "destination_market", "travel_behaviour", "airline", "hotels"):
        write_json(ROOT / precomputed_paths[tab], build_tab_file(tab, records, bootstrap))

    update_manifest(precomputed_paths)
    print(f"Precomputed dashboard summaries for {len(records):,} records.")
    for name, rel in precomputed_paths.items():
        size = (ROOT / rel).stat().st_size
        print(f"  {name}: {rel} ({size:,} bytes)")


if __name__ == "__main__":
    main()
