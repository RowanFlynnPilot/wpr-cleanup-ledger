"""Build static JSON from data/cleanup.db into public/data/.

Outputs are deterministic: identical database contents produce
byte-identical files, so the nightly workflow only commits when the
underlying data changed. No generated-at timestamps in outputs.

Editorial rules enforced here:
- Only Responsible Party and Owner names are published; DNR staff,
  consultants, and agents stay out of the public JSON.
- events.json feeds internal review. Nothing here auto-publishes to
  wausaupilotandreview.com; the production embed ships only after
  editorial review.
"""

import json
import sqlite3
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DB_PATH = REPO_ROOT / "data" / "cleanup.db"
OUT_DIR = REPO_ROOT / "public" / "data"

PUBLISHED_ROLES = ("Responsible Party", "Owner")


def write(path: Path, payload: dict) -> None:
    path.write_text(
        json.dumps(payload, indent=1, sort_keys=True, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"  wrote {path.relative_to(REPO_ROOT)}")


def meta_value(conn: sqlite3.Connection, key: str) -> str:
    row = conn.execute("SELECT value FROM meta WHERE key = ?", (key,)).fetchone()
    if row is None:
        raise RuntimeError(f"meta key '{key}' missing; run the ingest scripts first")
    return row[0]


def build_sites(conn: sqlite3.Connection) -> dict:
    sites = []
    for a in conn.execute(
        "SELECT detail_seq_no, activity_display_number, activity_name, activity_type, "
        "address, muni, status, start_date, end_date, lat, lon, "
        "co_contamination_flag, offsite_impact_flag, pfas_flag "
        "FROM activity WHERE co_flag = 1 ORDER BY activity_display_number"
    ):
        dsn = a[0]
        parties = conn.execute(
            "SELECT DISTINCT role, full_name, city, state FROM party "
            f"WHERE detail_seq_no = ? AND role IN ({','.join('?' * len(PUBLISHED_ROLES))}) "
            "ORDER BY role, full_name",
            (dsn, *PUBLISHED_ROLES),
        ).fetchall()
        co_actions = conn.execute(
            "SELECT action_date, action_name FROM action "
            "WHERE detail_seq_no = ? AND (action_name LIKE 'Continuing Obligation%' "
            "OR action_name LIKE 'Deed %' OR action_name LIKE 'CO %') "
            "ORDER BY action_date, action_name",
            (dsn,),
        ).fetchall()
        sites.append({
            "dsn": dsn,  # DNR public record: apps.dnr.wi.gov/rrbotw/botw-activity-detail?dsn=<dsn>
            "brrts": a[1],
            "name": a[2],
            "type": a[3],
            "address": a[4],
            "muni": a[5],
            "status": a[6],
            "start_date": a[7],
            "end_date": a[8],
            "lat": a[9],
            "lon": a[10],
            "contamination_moved_offsite": bool(a[12]),
            "co_from_another_property": bool(a[11]),
            "pfas": bool(a[13]),
            "parties": [
                {"role": p[0], "name": p[1], "city": p[2], "state": p[3]}
                for p in parties
            ],
            "obligations": [{"date": c[0], "action": c[1]} for c in co_actions],
        })
    return {
        "bulk_extract_date": meta_value(conn, "bulk_extract_date"),
        "sites": sites,
    }


def build_events(conn: sqlite3.Connection) -> dict:
    events = [
        {
            "detected_at": e[0],
            "event_type": e[1],
            "layer_id": e[2],
            "brrts": e[3],
            "name": e[4],
            "address": e[5],
            "muni": e[6],
        }
        for e in conn.execute(
            "SELECT detected_at, event_type, layer_id, activity_number, "
            "activity_name, loc_addr, loc_city FROM event ORDER BY id DESC"
        )
    ]
    return {"events": events}


def build_summary(conn: sqlite3.Connection) -> dict:
    by_type = dict(conn.execute(
        "SELECT activity_type, COUNT(*) FROM activity GROUP BY activity_type"))
    by_status = dict(conn.execute(
        "SELECT COALESCE(NULLIF(status, ''), 'N/A'), COUNT(*) FROM activity GROUP BY 1"))
    co_by_muni = dict(conn.execute(
        "SELECT muni, COUNT(*) FROM activity WHERE co_flag = 1 GROUP BY muni"))
    return {
        "bulk_extract_date": meta_value(conn, "bulk_extract_date"),
        "activities_total": conn.execute("SELECT COUNT(*) FROM activity").fetchone()[0],
        "continuing_obligation_sites": conn.execute(
            "SELECT COUNT(*) FROM activity WHERE co_flag = 1").fetchone()[0],
        "by_type": by_type,
        "by_status": by_status,
        "co_by_municipality": co_by_muni,
    }


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print("Building public/data:")
    write(OUT_DIR / "sites.json", build_sites(conn))
    write(OUT_DIR / "events.json", build_events(conn))
    write(OUT_DIR / "summary.json", build_summary(conn))
    conn.close()


if __name__ == "__main__":
    sys.exit(main())
