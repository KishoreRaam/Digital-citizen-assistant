#!/usr/bin/env python3
"""One-off build script: extracts benefit_category/benefit_type/benefit_amount_min/
benefit_amount_max/application_cost for each scheme in data/schemes.json, used by
the Benefit Dashboard (see benefitCalculator.js). Extraction is grounded ONLY in
each scheme's existing English name/eligibility/description/source text — the
model is explicitly told to return nulls rather than estimate a plausible-looking
number, since these figures feed a "your estimated benefit" total shown to
citizens deciding whether a scheme is worth applying to.

Run manually with `python3 scripts/extract-benefit-data.py` after
build-schemes.py / translate-schemes.py, or whenever scheme text changes.

Requires GEMINI_API_KEY in the environment or a .env file in the repo root.
"""
import json
import os
import re
import time
import urllib.error
import urllib.request

GEMINI_MODEL = "gemini-3.1-flash-lite"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
BATCH_SIZE = 8

SYSTEM_PROMPT = """You extract structured benefit figures from Indian government
welfare-scheme catalogue entries, for a dashboard that tells citizens roughly how
much a scheme is worth. Accuracy matters more than completeness: only report a
number that is explicitly stated in the given text. If the text does not state a
specific rupee amount, you MUST return nulls rather than estimate, guess, or use
outside knowledge of what the scheme "usually" pays — a wrong number here is
worse than no number.

For each scheme given (id, name, eligibility, description, source), return:

- benefit_category: one of
  - "cash": a direct cash transfer, pension, stipend, subsidy amount, or
    scholarship amount paid to the citizen.
  - "coverage": insurance/treatment cost coverage, a sum-insured cap, or a
    reimbursement ceiling — money available if needed, not a guaranteed payout.
  - "none": no rupee figure for the citizen is stated in the text — this
    includes loans/credit lines/credit guarantees (must be repaid, not a
    benefit), interest subvention without a stated rupee amount, free
    devices/services/training/registration with no stated cash value, and any
    scheme whose description doesn't name a specific amount.
- benefit_type: one of "one_time", "monthly", "annual", or null. null whenever
  benefit_category is "none". For "coverage", use the period the cover renews
  over if stated (e.g. "up to Rs.5 lakh per year" -> "annual"; a one-off
  reimbursement -> "one_time"); if no period is stated, use "one_time".
- benefit_amount_min: the lower end of the stated amount (a plain number, no
  currency symbol or commas), or null if benefit_category is "none".
- benefit_amount_max: the upper end of the stated amount. Equal to
  benefit_amount_min when the text states a single fixed amount rather than a
  range. null if benefit_category is "none".
- application_cost: a plain number, the fee the citizen must pay to apply, ONLY
  if the text explicitly states one. Default to 0 (not null) when no fee is
  mentioned — most of these schemes are free to apply to and 0 is the correct
  reading of silence here, unlike the benefit amount fields above.

Examples:
Input: {"id": "x", "name": "...", "eligibility": "...", "description": "Monthly pension of approx. Rs.1,000-1,500 to destitute elderly persons.", "source": "..."}
Output: {"id": "x", "benefit_category": "cash", "benefit_type": "monthly", "benefit_amount_min": 1000, "benefit_amount_max": 1500, "application_cost": 0}

Input: {"id": "y", "name": "Kisan Credit Card (KCC) Scheme", "eligibility": "...", "description": "Short-term crop loans up to Rs.3 lakh at subsidised interest.", "source": "..."}
Output: {"id": "y", "benefit_category": "none", "benefit_type": null, "benefit_amount_min": null, "benefit_amount_max": null, "application_cost": 0}
(A loan must be repaid — it is credit access, not a benefit amount, even though a rupee figure appears in the text.)

Input: {"id": "z", "name": "CMCHIS", "eligibility": "...", "description": "Cashless treatment coverage up to Rs.5,00,000 per family per year.", "source": "..."}
Output: {"id": "z", "benefit_category": "coverage", "benefit_type": "annual", "benefit_amount_min": 500000, "benefit_amount_max": 500000, "application_cost": 0}

Respond with STRICT JSON only, no prose, no markdown fences, matching this shape:
{
  "extractions": [
    {
      "id": "<scheme id, copied exactly from input>",
      "benefit_category": "cash" | "coverage" | "none",
      "benefit_type": "one_time" | "monthly" | "annual" | null,
      "benefit_amount_min": number | null,
      "benefit_amount_max": number | null,
      "application_cost": number
    }
  ]
}
One entry per input scheme, in the same order, same ids."""

RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "extractions": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "id": {"type": "STRING"},
                    "benefit_category": {"type": "STRING", "enum": ["cash", "coverage", "none"]},
                    "benefit_type": {
                        "type": "STRING",
                        "enum": ["one_time", "monthly", "annual", "none"],
                    },
                    "benefit_amount_min": {"type": "NUMBER", "nullable": True},
                    "benefit_amount_max": {"type": "NUMBER", "nullable": True},
                    "application_cost": {"type": "NUMBER"},
                },
                "required": [
                    "id",
                    "benefit_category",
                    "benefit_type",
                    "benefit_amount_min",
                    "benefit_amount_max",
                    "application_cost",
                ],
            },
        }
    },
    "required": ["extractions"],
}


def load_api_key():
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        return key
    if os.path.exists(".env"):
        for line in open(".env", encoding="utf-8"):
            m = re.match(r"\s*GEMINI_API_KEY\s*=\s*(.+)\s*$", line)
            if m:
                return m.group(1).strip().strip('"').strip("'")
    raise SystemExit("GEMINI_API_KEY not found in environment or .env")


def call_model(api_key, batch):
    user_message = json.dumps(
        [
            {
                "id": s["id"],
                "name": s["name"],
                "eligibility": s["eligibility"],
                "description": s["description"],
                "source": s["source"],
            }
            for s in batch
        ],
        ensure_ascii=False,
    )
    body = json.dumps(
        {
            "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
            "contents": [{"role": "user", "parts": [{"text": user_message}]}],
            "generationConfig": {
                "temperature": 0.0,
                "maxOutputTokens": 6000,
                "responseMimeType": "application/json",
                "responseSchema": RESPONSE_SCHEMA,
            },
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        GEMINI_URL,
        data=body,
        headers={"content-type": "application/json", "x-goog-api-key": api_key},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        data = json.load(r)

    candidate = (data.get("candidates") or [{}])[0]
    parts = ((candidate.get("content") or {}).get("parts")) or []
    raw = "".join(p.get("text", "") for p in parts).strip()
    return json.loads(raw)


def sanitize_entry(entry):
    category = entry.get("benefit_category")
    if category not in ("cash", "coverage", "none"):
        category = "none"

    btype = entry.get("benefit_type")
    if btype not in ("one_time", "monthly", "annual"):
        btype = None
    if category == "none":
        btype = None

    def num_or_none(v):
        if v is None:
            return None
        try:
            return float(v)
        except (TypeError, ValueError):
            return None

    amount_min = num_or_none(entry.get("benefit_amount_min")) if category != "none" else None
    amount_max = num_or_none(entry.get("benefit_amount_max")) if category != "none" else None
    if category != "none" and (amount_min is None or amount_max is None):
        # Model returned a category but no usable numbers — treat as "none"
        # rather than render a broken/zero amount downstream.
        category, btype, amount_min, amount_max = "none", None, None, None

    cost = num_or_none(entry.get("application_cost"))
    cost = cost if cost is not None else 0

    return {
        "benefit_category": category,
        "benefit_type": btype,
        "benefit_amount_min": amount_min,
        "benefit_amount_max": amount_max,
        "application_cost": cost,
    }


def main():
    api_key = load_api_key()

    with open("data/schemes.json", encoding="utf-8") as f:
        schemes = json.load(f)

    by_id = {s["id"]: s for s in schemes}
    batches = [schemes[i : i + BATCH_SIZE] for i in range(0, len(schemes), BATCH_SIZE)]

    extracted_ids = set()
    for i, batch in enumerate(batches):
        print(f"batch {i+1}/{len(batches)} ({len(batch)} schemes)...")
        attempt = 0
        while True:
            attempt += 1
            try:
                result = call_model(api_key, batch)
                break
            except (urllib.error.URLError, json.JSONDecodeError, KeyError) as e:
                if attempt >= 6:
                    raise
                print(f"  retrying after error: {e}")
                time.sleep(15 * attempt)
        time.sleep(5)

        for entry in result.get("extractions", []):
            sid = entry.get("id")
            if sid not in by_id:
                print(f"  WARNING: unknown id in response: {sid}")
                continue
            by_id[sid].update(sanitize_entry(entry))
            extracted_ids.add(sid)

    missing = [s["id"] for s in schemes if s["id"] not in extracted_ids]
    print(f"extracted: {len(extracted_ids)}/{len(schemes)}")
    if missing:
        print(f"MISSING extraction for: {missing}")

    cash = sum(1 for s in schemes if s.get("benefit_category") == "cash")
    coverage = sum(1 for s in schemes if s.get("benefit_category") == "coverage")
    none_cat = sum(1 for s in schemes if s.get("benefit_category") == "none")
    print(f"cash: {cash}, coverage: {coverage}, none: {none_cat}")

    with open("data/schemes.json", "w", encoding="utf-8") as f:
        json.dump(schemes, f, ensure_ascii=False, indent=2)
        f.write("\n")


if __name__ == "__main__":
    main()
