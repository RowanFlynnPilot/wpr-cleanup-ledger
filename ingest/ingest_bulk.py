"""Quarterly ingest of the BRRTS public bulk data extract.

Downloads the statewide zip (~35 MB, published quarterly), filters every
table to the eight-county coverage area (ingest/counties.py), and replaces
the bulk tables in one transaction.

One correct path:
- The zip is streamed to a temp file and read in place; nothing statewide
  is ever loaded into the database.
- Bulk tables are DELETE-and-reload. The quarterly extract is the source
  of truth for the spine; there is no merge logic.
- Files are cp1252 with occasional stray bytes in free-text comment
  fields; those bytes are replaced during decode. Structural problems
  (missing columns, zero rows, wrong county codes) raise.
"""

import csv
import io
import sqlite3
import sys
import tempfile
import zipfile
from datetime import date
from pathlib import Path

import requests

REPO_ROOT = Path(__file__).resolve().parents[1]
DB_PATH = REPO_ROOT / "data" / "cleanup.db"
SCHEMA_PATH = REPO_ROOT / "schema.sql"

BULK_URL = (
    "https://apps.dnr.wi.gov/rrbotw/download-document"
    "?docSeqNo=0&bulkDownload=wdnr-brrts-data.zip&sender=bulkData"
)
MEMBER_DIR = "wdnr-brrts-data"

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ingest.counties import BULK_NAME_TO_CODE, COUNTIES  # noqa: E402

csv.field_size_limit(10**9)


def flag(value: str) -> int:
    return 1 if value.strip().upper() == "Y" else 0


def number(value: str):
    value = value.strip()
    return float(value) if value else None


def rows_of(zf: zipfile.ZipFile, member: str):
    """Yield dict rows from one tab-delimited member of the zip.

    Every value is stripped here, at the door: bulk fields carry stray
    leading/trailing whitespace, and downstream consumers (JSON builds,
    DISTINCT dedup, exact-match status/type checks, Phase 2 joins) all
    assume clean strings. One correct path: nothing dirty enters the DB.
    """
    with zf.open(f"{MEMBER_DIR}/{member}") as raw:
        text = io.TextIOWrapper(raw, encoding="cp1252", errors="replace")
        for row in csv.DictReader(text, delimiter="\t"):
            yield {
                k: v.strip() if isinstance(v, str) else v
                for k, v in row.items()
            }


def load_activities(zf: zipfile.ZipFile) -> list[dict]:
    activities = [
        row
        for row in rows_of(zf, "facility-activity.txt")
        if row["county_name"].strip().upper() in BULK_NAME_TO_CODE
    ]
    # Per-row cross-check: the county name and the code encoded in digits
    # 3-4 of the activity number must agree, for every county.
    bad = [
        a["activity_number"]
        for a in activities
        if a["activity_number"][2:4] != BULK_NAME_TO_CODE[a["county_name"].strip().upper()]
    ]
    if bad:
        raise RuntimeError(f"County-name/county-code mismatch, e.g. {bad[:3]}")
    # Per-county floors: drastically fewer activities than the expansion
    # baseline means the parse broke, not the county.
    by_code = {}
    for a in activities:
        code = a["activity_number"][2:4]
        by_code[code] = by_code.get(code, 0) + 1
    for code, county in COUNTIES.items():
        n = by_code.get(code, 0)
        if n < county["min_activities"]:
            raise RuntimeError(
                f"Only {n} {county['name']} activities parsed; "
                f"expected at least {county['min_activities']}"
            )
    print("  per county:", ", ".join(
        f"{COUNTIES[code]['name']} {by_code.get(code, 0)}"
        for code in sorted(COUNTIES)
    ))
    return activities


def main() -> None:
    with tempfile.NamedTemporaryFile(suffix=".zip") as tmp:
        with requests.get(BULK_URL, stream=True, timeout=300) as resp:
            resp.raise_for_status()
            for chunk in resp.iter_content(chunk_size=1 << 20):
                tmp.write(chunk)
        tmp.flush()

        # Open via the existing handle, not the path: on Windows the
        # NamedTemporaryFile holds the file exclusively while open.
        zf = zipfile.ZipFile(tmp)
        extract_date = date(
            *zf.getinfo(f"{MEMBER_DIR}/facility-activity.txt").date_time[:3]
        ).isoformat()

        activities = load_activities(zf)
        area_ids = {a["detail_seq_no"] for a in activities}

        parties = [
            (r["detail_seq_no"], r["role_desc"].strip(), r["full_name"],
             flag(r["org_flag"]), r["city"], r["state_abbr"])
            for r in rows_of(zf, "who.txt")
            if r["detail_seq_no"] in area_ids
        ]
        actions = [
            (r["detail_seq_no"], r["action_date"], r["action_code"],
             r["action_name"], r["action_desc"])
            for r in rows_of(zf, "actions.txt")
            if r["detail_seq_no"] in area_ids
        ]
        impacts = [
            (r["detail_seq_no"], r["impact_code"], r["impact_desc"],
             flag(r["potential_flag"]))
            for r in rows_of(zf, "impacts.txt")
            if r["detail_seq_no"] in area_ids
        ]
        substances = [
            (r["detail_seq_no"], r["substance_desc"],
             r["spill_released_amt"], r["spill_released_unit_code"])
            for r in rows_of(zf, "substances.txt")
            if r["detail_seq_no"] in area_ids
        ]

    if not parties or not actions:
        raise RuntimeError(
            "Bulk extract yielded no parties or no actions for the coverage area"
        )

    conn = sqlite3.connect(DB_PATH)
    conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
    with conn:
        for table in ("substance", "impact", "action", "party", "activity"):
            conn.execute(f"DELETE FROM {table}")
        conn.executemany(
            "INSERT INTO activity (detail_seq_no, site_id, activity_number, "
            "activity_display_number, activity_name, activity_type, act_code, "
            "address, muni, zip, status, start_date, end_date, lat, lon, "
            "co_flag, co_contamination_flag, offsite_impact_flag, row_impact_flag, "
            "pfas_flag, drycleaner_flag, petrol_ust_flag, vple_coc_flag, sfr_flag) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                (a["detail_seq_no"], a["site_id"], a["activity_number"],
                 a["activity_display_number"], a["activity_name"], a["activity_type"],
                 a["act_code"], a["address"], a["muni"], a["zip"], a["status"],
                 a["start_date"], a["end_date"],
                 number(a["ll_lat_dd_amt"]), number(a["ll_long_dd_amt"]),
                 flag(a["co_flag"]), flag(a["co_contamination_flag"]),
                 flag(a["offsite_impact_flag"]), flag(a["row_impact_flag"]),
                 flag(a["pfas_flag"]), flag(a["drycleaner_flag"]),
                 flag(a["petrol_ust_flag"]), flag(a["vple_coc_flag"]),
                 flag(a["sfr_flag"]))
                for a in activities
            ],
        )
        conn.executemany(
            "INSERT INTO party (detail_seq_no, role, full_name, is_org, city, state) "
            "VALUES (?, ?, ?, ?, ?, ?)", parties)
        conn.executemany(
            "INSERT INTO action (detail_seq_no, action_date, action_code, "
            "action_name, action_desc) VALUES (?, ?, ?, ?, ?)", actions)
        conn.executemany(
            "INSERT INTO impact (detail_seq_no, impact_code, impact_desc, "
            "potential_flag) VALUES (?, ?, ?, ?)", impacts)
        conn.executemany(
            "INSERT INTO substance (detail_seq_no, substance, released_amt, "
            "released_unit) VALUES (?, ?, ?, ?)", substances)
        conn.execute(
            "INSERT INTO meta (key, value) VALUES ('bulk_extract_date', ?) "
            "ON CONFLICT (key) DO UPDATE SET value = excluded.value",
            (extract_date,),
        )

    co_count = conn.execute("SELECT COUNT(*) FROM activity WHERE co_flag = 1").fetchone()[0]
    print(f"Bulk extract dated {extract_date} loaded:")
    print(f"  activities: {len(activities)} ({co_count} with continuing obligations)")
    print(f"  parties:    {len(parties)}")
    print(f"  actions:    {len(actions)}")
    print(f"  impacts:    {len(impacts)}")
    print(f"  substances: {len(substances)}")
    conn.close()


if __name__ == "__main__":
    sys.exit(main())
