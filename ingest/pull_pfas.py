"""Nightly pull of Marathon County municipal PFAS sampling results.

Queries the DNR Municipal System PFAS Sampling layer with a server-side
spatial filter (the committed Marathon County polygon), diffs against
stored pfas_system state, emits editorial events, and replaces state.

One correct path:
- County assignment is point-in-polygon, executed by the DNR server
  against data/marathon_county.geojson (Census TIGERweb, GEOID 55073,
  fetched 2026-07-17). Mailing-city matching is wrong and is not used
  anywhere: Abbotsford and Birnamwood systems mail from Marathon-sounding
  cities but sit in Clark/Shawano counties, while Maine Water Utility and
  Rib Mountain Water Utility mail as WAUSAU and would be missed.
- Layer points are PLSS section centroids, not well locations. County
  lines here follow section lines, so centroid-vs-boundary error stays
  well under half a mile; a system whose section straddles the line lands
  wherever DNR placed the centroid. Acceptable at the layer's stated
  resolution.
- Single request. The layer holds ~600 systems statewide, far below the
  service's maxRecordCount; if exceededTransferLimit ever trips, that is
  a precondition failure and we raise.
- SAMPLE_RESULTS is DNR's ordinal category, stored verbatim (NULL means
  sampled with no result posted). The category is the entire editorial
  signal, so this script diffs that one attribute in addition to set
  membership — a deliberate, scoped exception to the membership-only
  diff rule (CLAUDE.md decision 2). No other attribute emits events.
- Baseline rule and quiet-repo rule as in pull_arcgis.py: the first run
  on an empty pfas_system writes state and emits zero events; if nothing
  changed, nothing is written.

Editorial note: these are drinking-water accountability records about
municipal utilities. They are not health-outcome data and must never be
joined to disease rates in this repo (CLAUDE.md editorial policy).
"""

import json
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

REPO_ROOT = Path(__file__).resolve().parents[1]
DB_PATH = REPO_ROOT / "data" / "cleanup.db"
SCHEMA_PATH = REPO_ROOT / "schema.sql"
BOUNDARY_PATH = REPO_ROOT / "data" / "marathon_county.geojson"

LAYER_URL = (
    "https://dnrmaps.wi.gov/arcgis2/rest/services/DG_Groundwater_Retrieval_Network/"
    "DG_Municipal_System_PFAS_Sampling_Ext/MapServer/0/query"
)
FIELDS = [
    "PWS_ID",
    "PWS_NAME",
    "CITY",
    "SAMPLE_STATUS",
    "SAMPLE_DATE",
    "SAMPLE_RESULTS",
]


def epoch_ms_to_date(value):
    """ArcGIS date fields arrive as epoch milliseconds. None passes through."""
    if value is None:
        return None
    return datetime.fromtimestamp(value / 1000, tz=timezone.utc).date().isoformat()


def fetch_systems() -> dict[str, dict]:
    """Return {pws_id: row} for municipal systems inside Marathon County."""
    rings = json.loads(BOUNDARY_PATH.read_text(encoding="utf-8"))["geometry"][
        "coordinates"
    ]
    resp = requests.post(  # POST: the county polygon is too large for a GET URL
        LAYER_URL,
        data={
            "where": "1=1",
            "geometry": json.dumps(
                {"rings": rings, "spatialReference": {"wkid": 4326}}
            ),
            "geometryType": "esriGeometryPolygon",
            "inSR": "4326",
            "spatialRel": "esriSpatialRelIntersects",
            "outFields": ",".join(FIELDS),
            "returnGeometry": "true",
            "outSR": "4326",
            "f": "json",
        },
        timeout=60,
    )
    resp.raise_for_status()
    payload = resp.json()
    if "error" in payload:
        raise RuntimeError(f"PFAS layer query error: {payload['error']}")
    if payload.get("exceededTransferLimit"):
        raise RuntimeError(
            "PFAS layer exceeded transfer limit; single-request assumption broken"
        )

    records = {}
    for feature in payload["features"]:
        a = {
            k: v.strip() if isinstance(v, str) else v
            for k, v in feature["attributes"].items()
        }
        pws_id = a["PWS_ID"]
        if pws_id in records:
            raise RuntimeError(f"Duplicate PWS_ID {pws_id}; one-row-per-system broken")
        records[pws_id] = {
            "pws_name": a["PWS_NAME"],
            "city": a["CITY"],
            "sample_status": a["SAMPLE_STATUS"],
            "sample_date": epoch_ms_to_date(a["SAMPLE_DATE"]),
            "sample_results": a["SAMPLE_RESULTS"],
            "lat": feature["geometry"]["y"],
            "lon": feature["geometry"]["x"],
        }
    if not records:
        raise RuntimeError("PFAS layer returned zero Marathon systems")
    return records


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))

    live = fetch_systems()

    stored = {
        row[0]: {
            "pws_name": row[1],
            "city": row[2],
            "sample_status": row[3],
            "sample_date": row[4],
            "sample_results": row[5],
            "lat": row[6],
            "lon": row[7],
        }
        for row in conn.execute(
            "SELECT pws_id, pws_name, city, sample_status, sample_date, "
            "sample_results, lat, lon FROM pfas_system"
        )
    }
    baseline = not stored
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")

    events = []
    if not baseline:
        for pws_id in sorted(set(live) - set(stored)):
            r = live[pws_id]
            events.append(
                (now, "PFAS_SYSTEM_ADDED", pws_id, r["pws_name"], r["city"],
                 None, r["sample_results"])
            )
        for pws_id in sorted(set(stored) - set(live)):
            r = stored[pws_id]
            events.append(
                (now, "PFAS_SYSTEM_REMOVED", pws_id, r["pws_name"], r["city"],
                 r["sample_results"], None)
            )
        for pws_id in sorted(set(live) & set(stored)):
            old = stored[pws_id]["sample_results"]
            new = live[pws_id]["sample_results"]
            if old != new:
                r = live[pws_id]
                events.append(
                    (now, "PFAS_RESULT_CHANGED", pws_id, r["pws_name"], r["city"],
                     old, new)
                )

    if not baseline and not events and stored == live:
        print(f"No changes across {len(live)} PFAS systems.")
        conn.close()
        return

    with conn:
        conn.execute("DELETE FROM pfas_system")
        conn.executemany(
            "INSERT INTO pfas_system (pws_id, pws_name, city, sample_status, "
            "sample_date, sample_results, lat, lon) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [
                (pws_id, r["pws_name"], r["city"], r["sample_status"],
                 r["sample_date"], r["sample_results"], r["lat"], r["lon"])
                for pws_id, r in records_sorted(live)
            ],
        )
        conn.executemany(
            "INSERT INTO pfas_event (detected_at, event_type, pws_id, pws_name, "
            "city, old_results, new_results) VALUES (?, ?, ?, ?, ?, ?, ?)",
            events,
        )
        conn.execute(
            "INSERT INTO meta (key, value) VALUES ('last_pfas_pull', ?) "
            "ON CONFLICT (key) DO UPDATE SET value = excluded.value",
            (now,),
        )

    label = "Baseline load" if baseline else "Update"
    print(f"{label}: {len(live)} PFAS systems, {len(events)} events.")
    for e in events:
        print(f"  {e[1]}  {e[3]} ({e[4]})  {e[5]!r} -> {e[6]!r}")
    conn.close()


def records_sorted(records: dict[str, dict]):
    """Deterministic insert order so the DB file is stable for identical data."""
    return sorted(records.items())


if __name__ == "__main__":
    sys.exit(main())
