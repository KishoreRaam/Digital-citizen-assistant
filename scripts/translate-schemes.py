#!/usr/bin/env python3
"""One-off build script: adds Tamil and Hindi translations of each scheme's
name/eligibility/description/source to data/schemes.json, under an "i18n" key
per scheme. Run manually with `python3 scripts/translate-schemes.py` after
build-schemes.py, or whenever scheme text changes.

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

SYSTEM_PROMPT = """You are translating official Indian government welfare-scheme
catalogue entries from English into Tamil and Hindi, for citizens deciding
whether they qualify. Accuracy matters more than fluency: this text determines
real eligibility decisions, so never add, drop, soften, or generalize a
number, age, income threshold, acronym, or condition that is not in the
English source.

For each scheme given, translate these four fields into both Tamil ("ta") and
Hindi ("hi"):
- name: the official scheme name. Give the natural Tamil/Hindi rendering, but
  keep any English acronym in parentheses unchanged, e.g. "(PMAY-G)".
- eligibility: the eligibility criteria, translated faithfully — same facts,
  same numbers, same conditions, nothing added or removed.
- description: what the citizen receives.
- source: keep proper nouns / website names / organisation names that are
  normally written in Latin script (e.g. "SchemesinIndia.in", "NSAP") as-is;
  translate the surrounding descriptive words.

Respond with STRICT JSON only, no prose, no markdown fences, matching this
shape:
{
  "translations": [
    {
      "id": "<scheme id, copied exactly from input>",
      "ta": {"name": "...", "eligibility": "...", "description": "...", "source": "..."},
      "hi": {"name": "...", "eligibility": "...", "description": "...", "source": "..."}
    }
  ]
}
One entry per input scheme, in the same order, same ids."""

RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "translations": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "id": {"type": "STRING"},
                    "ta": {
                        "type": "OBJECT",
                        "properties": {
                            "name": {"type": "STRING"},
                            "eligibility": {"type": "STRING"},
                            "description": {"type": "STRING"},
                            "source": {"type": "STRING"},
                        },
                        "required": ["name", "eligibility", "description", "source"],
                    },
                    "hi": {
                        "type": "OBJECT",
                        "properties": {
                            "name": {"type": "STRING"},
                            "eligibility": {"type": "STRING"},
                            "description": {"type": "STRING"},
                            "source": {"type": "STRING"},
                        },
                        "required": ["name", "eligibility", "description", "source"],
                    },
                },
                "required": ["id", "ta", "hi"],
            },
        }
    },
    "required": ["translations"],
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
                "temperature": 0.1,
                "maxOutputTokens": 8000,
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


def main():
    api_key = load_api_key()

    with open("data/schemes.json", encoding="utf-8") as f:
        schemes = json.load(f)

    by_id = {s["id"]: s for s in schemes}
    batches = [schemes[i : i + BATCH_SIZE] for i in range(0, len(schemes), BATCH_SIZE)]

    translated_ids = set()
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

        for entry in result.get("translations", []):
            sid = entry.get("id")
            if sid not in by_id:
                print(f"  WARNING: unknown id in response: {sid}")
                continue
            ta = entry.get("ta") or {}
            hi = entry.get("hi") or {}
            by_id[sid]["i18n"] = {
                "ta": {
                    "name": ta.get("name", ""),
                    "eligibility": ta.get("eligibility", ""),
                    "description": ta.get("description", ""),
                    "source": ta.get("source", ""),
                },
                "hi": {
                    "name": hi.get("name", ""),
                    "eligibility": hi.get("eligibility", ""),
                    "description": hi.get("description", ""),
                    "source": hi.get("source", ""),
                },
            }
            translated_ids.add(sid)

    missing = [s["id"] for s in schemes if s["id"] not in translated_ids]
    print(f"translated: {len(translated_ids)}/{len(schemes)}")
    if missing:
        print(f"MISSING translations for: {missing}")

    with open("data/schemes.json", "w", encoding="utf-8") as f:
        json.dump(schemes, f, ensure_ascii=False, indent=2)
        f.write("\n")


if __name__ == "__main__":
    main()
