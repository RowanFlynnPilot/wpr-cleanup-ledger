"""Nightly pull of Marathon County records from the DNR RR Sites Map.

Queries five public ArcGIS layers, diffs each against the stored map_state,
emits editorial events for appearances/disappearances, and replaces map_state.

One correct path:
- Single request per layer. Marathon counts (49-697) sit far below the
  service's maxRecordCount of 2000; if exceededTransferLimit ever trips,
  that is a precondition failure and we raise.
- First ever run (empty map_state) is a baseline load: state is written,
  no events are emitted.
- If nothing changed, nothing is written. The database file only moves
  when the world does, which keeps the git history quiet.
"""

import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

REPO_ROOT = Path(__file__).resolve().parents[1]
DB_PATH = REPO_ROOT / "data" / "cleanup.db"
SCHEMA_PATH = REPO_ROOT / "schema.sql"

BASE_URL = (
    "https://dnrmaps.wi.gov/arcgis/rest/services/RR_Sites_Map/"
    "RR_PUBLIC_MAPSERVICES_CORE_EXT/MapServer"
)
COUNTY_CODE = "37"  # Marathon: digits 3-4 of the 10-digit BRRTS activity number
WHERE = f"ACTIVITY_DETAIL_NO LIKE '__{COUNTY_CODE}%'"

COMMON_FIELDS = [
    "DETAIL_SEQ_NO",
    "ACTIVITY_DETAIL_NO",
    "ACTIVITY_DETAIL_NAME",
    "LOC_ADDR",
    "LOC_CITY",
    "START_DATE",
    "END_DATE",
]
PARENT_FIELDS = ["PARENT_DSN", "PARENT_BRRTSNO", "PARENT_NAME"]  # layer 220 only

# layer_id -> (event on appearance, event on disappearance)
EVENT_TYPES = {
    101: ("CASE_OPENED", "NO_LONGER_OPEN"),
    103: ("CASE_CLOSED", "CASE_REOPENED_OR_REMOVED"),
    105: ("CO_APPLIED", "CO_REMOVED"),
    106: ("OFFSITE_IMPACT_FLAGGED", "OFFSITE_IMPACT_REMOVED"),
    220: ("AFFECTED_BY_NEIGHBOR_FLAGGED", "AFFECTED_BY_NEIGHBOR_REMOVED"),
}


def epoch_ms_to_date(value):
    """ArcGIS date fields arrive as epoch milliseconds. None passes through."""
    if value is None:
        return None
    return datetime.fromtimestamp(value / 1000, tz=timezone.utc).date().isoformat()


def fetch_layer(layer_id: int) -> dict[int, dict]:
    """Return {detail_seq_no: attributes} for one layer, Marathon only."""
    fields = COMMON_FIELDS + (PARENT_FIELDS if layer_id == 220 else [])
    resp = requests.get(
        f"{BASE_URL}/{layer_id}/query",
        params={
            "where": WHERE,
            "outFields": ",".join(fields),
            "returnGeometry": "false",
            "f": "json",
        },
        timeout=60,
    )
    resp.raise_for_status()
    payload = resp.json()
    if "error" in payload:
        raise RuntimeError(f"Layer {layer_id} query error: {payload['error']}")
    if payload.get("exceededTransferLimit"):
        raise RuntimeError(
            f"Layer {layer_id} exceeded transfer limit; single-request assumption broken"
        )

    records = {}
    for feature in payload["features"]:
        # Map attributes carry the same stray whitespace as the bulk feed;
        # strip at the door so map_state and the event feed stay clean.
        a = {
            k: v.strip() if isinstance(v, str) else v
            for k, v in feature["attributes"].items()
        }
        records[a["DETAIL_SEQ_NO"]] = {
            "activity_number": a["ACTIVITY_DETAIL_NO"],
            "activity_name": a["ACTIVITY_DETAIL_NAME"],
            "loc_addr": a["LOC_ADDR"],
            "loc_city": a["LOC_CITY"],
            "start_date": epoch_ms_to_date(a["START_DATE"]),
            "end_date": epoch_ms_to_date(a["END_DATE"]),
            "parent_dsn": a.get("PARENT_DSN"),
            "parent_brrts_no": a.get("PARENT_BRRTSNO"),
            "parent_name": a.get("PARENT_NAME"),
        }
    if not records:
        raise RuntimeError(f"Layer {layer_id} returned zero Marathon records")
    return records


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))

    live = {layer_id: fetch_layer(layer_id) for layer_id in EVENT_TYPES}

    stored_total = conn.execute("SELECT COUNT(*) FROM map_state").fetchone()[0]
    baseline = stored_total == 0
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")

    events = []
    for layer_id, records in live.items():
        stored = {
            row[0]
            for row in conn.execute(
                "SELECT detail_seq_no FROM map_state WHERE layer_id = ?", (layer_id,)
            )
        }
        appeared = set(records) - stored
        disappeared = stored - set(records)

        if baseline:
            continue

        appear_type, disappear_type = EVENT_TYPES[layer_id]
        for dsn in sorted(appeared):
            r = records[dsn]
            events.append(
                (now, appear_type, layer_id, dsn, r["activity_number"],
                 r["activity_name"], r["loc_addr"], r["loc_city"])
            )
        for dsn in sorted(disappeared):
            row = conn.execute(
                "SELECT activity_number, activity_name, loc_addr, loc_city "
                "FROM map_state WHERE layer_id = ? AND detail_seq_no = ?",
                (layer_id, dsn),
            ).fetchone()
            events.append((now, disappear_type, layer_id, dsn, *row))

    live_total = sum(len(records) for records in live.values())
    if not baseline and not events and stored_total == live_total:
        print(f"No changes across {live_total} records in {len(live)} layers.")
        conn.close()
        return

    with conn:
        conn.execute("DELETE FROM map_state")
        for layer_id, records in live.items():
            conn.executemany(
                "INSERT INTO map_state (layer_id, detail_seq_no, activity_number, "
                "activity_name, loc_addr, loc_city, start_date, end_date, "
                "parent_dsn, parent_brrts_no, parent_name) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    (layer_id, dsn, r["activity_number"], r["activity_name"],
                     r["loc_addr"], r["loc_city"], r["start_date"], r["end_date"],
                     r["parent_dsn"], r["parent_brrts_no"], r["parent_name"])
                    for dsn, r in records.items()
                ],
            )
        conn.executemany(
            "INSERT INTO event (detected_at, event_type, layer_id, detail_seq_no, "
            "activity_number, activity_name, loc_addr, loc_city) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            events,
        )
        conn.execute(
            "INSERT INTO meta (key, value) VALUES ('last_map_pull', ?) "
            "ON CONFLICT (key) DO UPDATE SET value = excluded.value",
            (now,),
        )

    label = "Baseline load" if baseline else "Update"
    print(f"{label}: {live_total} records across {len(live)} layers, {len(events)} events.")
    for e in events:
        print(f"  {e[1]}  {e[4]}  {e[5]}  ({e[6]}, {e[7]})")
    conn.close()


if __name__ == "__main__":
    sys.exit(main())
