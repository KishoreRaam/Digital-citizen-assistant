#!/usr/bin/env python3
"""One-off build script: converts the xlsx scheme directory into data/schemes.json.
Run manually with `python3 scripts/build-schemes.py` whenever the source xlsx changes."""
import zipfile
import xml.etree.ElementTree as ET
import json
import re
import unicodedata

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"

def col_letters(ref):
    return re.match(r"([A-Z]+)", ref).group(1)

def cell_text(c):
    is_el = c.find(f"{NS}is")
    if is_el is not None:
        t = is_el.find(f"{NS}t")
        return t.text if t is not None and t.text else ""
    v = c.find(f"{NS}v")
    return v.text if v is not None and v.text else ""

def load_sheet(path):
    z = zipfile.ZipFile(path)
    root = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
    rows = []
    for row in root.find(f"{NS}sheetData").findall(f"{NS}row"):
        cells = {}
        for c in row.findall(f"{NS}c"):
            letter = col_letters(c.attrib["r"])
            cells[letter] = cell_text(c).strip()
        rows.append(cells)
    return rows

def slugify(name):
    name = unicodedata.normalize("NFKD", name)
    # keep the parenthetical acronym out of the slug; use the primary name before " ("
    base = re.split(r"\s*\(", name)[0]
    base = base.lower()
    base = re.sub(r"[^a-z0-9]+", "-", base).strip("-")
    return base

def main():
    rows = load_sheet("India_Government_Schemes_Directory.xlsx")
    header, data_rows = rows[0], rows[1:]
    assert len(data_rows) == 120, f"expected 120 schemes, got {len(data_rows)}"

    schemes = []
    seen_ids = {}
    for r in data_rows:
        name = r.get("C", "")
        department = r.get("B", "")
        level_raw = r.get("D", "")
        eligibility = r.get("E", "")
        description = r.get("F", "")
        source = r.get("G", "")
        apply_url = r.get("H", "")

        level = "central" if level_raw.strip().lower() == "central" else "state"
        state = "Tamil Nadu" if level == "state" else None

        base_id = slugify(name)
        sid = base_id
        n = seen_ids.get(base_id, 0)
        if n:
            sid = f"{base_id}-{n+1}"
        seen_ids[base_id] = n + 1

        schemes.append({
            "id": sid,
            "name": name,
            "department": department,
            "level": level,
            "state": state,
            "eligibility": eligibility,
            "description": description,
            "source": source,
            "apply_url": apply_url,
        })

    schemes.sort(key=lambda s: (s["department"], s["name"]))

    missing_apply = [s["id"] for s in schemes if not s["apply_url"]]
    print(f"total schemes: {len(schemes)}")
    print(f"central: {sum(1 for s in schemes if s['level']=='central')}")
    print(f"state: {sum(1 for s in schemes if s['level']=='state')}")
    print(f"missing apply_url: {missing_apply}")

    ids = [s["id"] for s in schemes]
    dupes = {i for i in ids if ids.count(i) > 1}
    print(f"duplicate ids: {dupes}")

    with open("data/schemes.json", "w", encoding="utf-8") as f:
        json.dump(schemes, f, ensure_ascii=False, indent=2)
        f.write("\n")

if __name__ == "__main__":
    main()
