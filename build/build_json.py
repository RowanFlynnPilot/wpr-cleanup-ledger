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

# The widget renders these statuses with vetted editorial copy. Anything
# else (CONDITIONALLY CLOSED and VPLE WITHDRAWN both exist in Marathon
# County) must fail the build so a human writes the copy before it ships —
# same philosophy as the ingest scripts: structural surprises raise.
# Blank status is legitimate only on OFF-SITE records.
KNOWN_STATUSES = {"OPEN", "CLOSED"}

# DNR's continuing-obligation CONDITION actions ("Continuing Obligation -
# <condition>") classified into stable keys the widget renders as typed
# chips with vetted copy (widget/src/recordCopy.js). Same closed-vocabulary
# rule as KNOWN_STATUSES: a condition name not listed here fails the build
# so a human writes copy before it ships. Process/paperwork actions
# ("CO Packet…", "…Applied", audits, modifications) deliberately do not
# match the "Continuing Obligation - " prefix and stay untyped timeline
# entries.
KNOWN_CO_CONDITIONS = {
    "Continuing Obligation - Residual GW Contamination": "residual-gw",
    "Continuing Obligation - Residual Soil Contamination": "residual-soil",
    "Continuing Obligation - Maintain Cap Over Contaminated Area": "cap",
    "Continuing Obligation - Structural Impediment to Cleanup": "structural",
    "Continuing Obligation - Vapor Intrusion Response": "vapor",
    "Continuing Obligation - Monitoring Well Needs Abandonment": "well-abandonment",
    "Continuing Obligation - Soil at Industrial Levels": "industrial-soil",
    "Continuing Obligation - Site Specific Condition": "site-specific",
    "Continuing Obligation - Sediment Engineering Control": "sediment",
}
CO_CONDITION_PREFIX = "Continuing Obligation - "


def display_brrts(number: str) -> str:
    """10-digit map-layer activity number -> dashed display form.

    '0337000073' -> '03-37-000073', matching activity_display_number in the
    bulk extract (verified identical digits for all layer-220 parents).
    """
    return f"{number[:2]}-{number[2:4]}-{number[4:]}"


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
        status, activity_type = a[6], a[3]
        if status not in KNOWN_STATUSES and not (
            status == "" and activity_type == "OFF-SITE"
        ):
            raise RuntimeError(
                f"Activity {a[1]} has status {status!r} ({activity_type}); "
                "add vetted display copy to the widget before publishing it"
            )
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
        # Typed obligation conditions for chips/filtering. Closed vocabulary:
        # an unknown condition name means DNR added one and a human must
        # write display copy before it ships.
        co_types = set()
        for _, name in co_actions:
            if not name.startswith(CO_CONDITION_PREFIX):
                continue
            if name not in KNOWN_CO_CONDITIONS:
                raise RuntimeError(
                    f"Activity {a[1]} has unclassified CO condition {name!r}; "
                    "add it to KNOWN_CO_CONDITIONS and vetted display copy "
                    "to widget/src/recordCopy.js before publishing it"
                )
            co_types.add(KNOWN_CO_CONDITIONS[name])
        substances = [
            r[0]
            for r in conn.execute(
                "SELECT DISTINCT substance FROM substance "
                "WHERE detail_seq_no = ? ORDER BY substance",
                (dsn,),
            )
        ]
        impacts = [
            {"desc": r[0], "potential": bool(r[1])}
            for r in conn.execute(
                "SELECT DISTINCT impact_desc, potential_flag FROM impact "
                "WHERE detail_seq_no = ? ORDER BY impact_desc, potential_flag",
                (dsn,),
            )
        ]
        # Off-site records link back to the source contamination activity
        # (map layer 220 carries the parent). The map lags/leads the bulk by
        # up to a quarter, so a missing row is legitimate, not an error.
        source_site = None
        if a[3] == "OFF-SITE":
            row = conn.execute(
                "SELECT parent_dsn, parent_brrts_no, parent_name "
                "FROM map_state WHERE layer_id = 220 AND detail_seq_no = ?",
                (dsn,),
            ).fetchone()
            if row is not None:
                source_site = {
                    "dsn": row[0],
                    "brrts": display_brrts(row[1]),
                    "name": row[2],
                }
        affected_properties = [
            {"dsn": r[0], "brrts": display_brrts(r[1]), "name": r[2]}
            for r in conn.execute(
                "SELECT detail_seq_no, activity_number, activity_name "
                "FROM map_state WHERE layer_id = 220 AND parent_dsn = ? "
                "ORDER BY activity_number",
                (dsn,),
            )
        ]
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
            "co_types": sorted(co_types),
            "substances": substances,
            "impacts": impacts,
            "source_site": source_site,
            "affected_properties": affected_properties,
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


def build_pfas(conn: sqlite3.Connection) -> dict:
    """Municipal PFAS sampling state + internal event feed.

    Kept as its own file: the shape is system-keyed, not BRRTS-keyed. The
    widget renders each DNR result category only through vetted display
    copy (same KNOWN_STATUSES philosophy as sites.json) — enforced at
    widget build time by widget/scripts/check-pfas-copy.mjs, so a new
    category string here fails the deploy until copy is written.
    """
    systems = [
        {
            "pws_id": s[0],
            "name": s[1],
            "city": s[2],
            "sample_status": s[3],
            "sample_date": s[4],
            "results": s[5],
            "lat": s[6],
            "lon": s[7],
        }
        for s in conn.execute(
            "SELECT pws_id, pws_name, city, sample_status, sample_date, "
            "sample_results, lat, lon FROM pfas_system ORDER BY pws_id"
        )
    ]
    events = [
        {
            "detected_at": e[0],
            "event_type": e[1],
            "pws_id": e[2],
            "name": e[3],
            "city": e[4],
            "old_results": e[5],
            "new_results": e[6],
        }
        for e in conn.execute(
            "SELECT detected_at, event_type, pws_id, pws_name, city, "
            "old_results, new_results FROM pfas_event ORDER BY id DESC"
        )
    ]
    return {
        "last_pfas_pull": meta_value(conn, "last_pfas_pull"),
        "systems": systems,
        "events": events,
    }


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
        "enforcement": build_enforcement(conn),
    }


def build_enforcement(conn: sqlite3.Connection) -> dict:
    """County-wide, all-time counts of how obligations get enforced.

    Exact action-name matches against the quarterly bulk record: obligations
    applied vs compliance audits ever completed (the audit gap), and deed
    instruments recorded vs database-only notice (the notice gap — since
    June 2006 the DNR database itself is the official public notice,
    s. 292.12(3)). Counts are events, not sites. The widget presents these
    only through vetted copy in widget/src/recordCopy.js.
    """
    def count(name: str) -> int:
        return conn.execute(
            "SELECT COUNT(*) FROM action WHERE action_name = ?", (name,)
        ).fetchone()[0]

    enforcement = {
        "co_applied": count("Continuing Obligation(s) Applied"),
        "audits_complete": count("Continuing Obligation(s) Compliance Audit Complete"),
        "audits_vapor_only": count("CO Compliance Audit Complete - Vapor Only"),
        "audit_followup_needed": count(
            "Continuing Obligation(s) Compliance Audit Follow-up Needed"),
        "audit_followup_complete": count(
            "Continuing Obligation(s) Compliance Audit Follow-up Complete"),
        "deed_recorded": (
            count("Deed Restriction for Residual Soil Contamination Recorded")
            + count("Deed Affidavit Recorded at Closure")
            + count("Deed Affidavit for Contamination (NR 728) Recorded")
        ),
        "deed_terminated": count("Deed Instrument Terminated"),
        "modifications_approved": count("Continuing Obligation Modification Approval"),
        "obligations_removed": conn.execute(
            "SELECT COUNT(*) FROM action WHERE action_name LIKE "
            "'Continuing Obligation Removed - %' OR action_name = "
            "'Continuing Obligations Satisfied - No Longer Apply'"
        ).fetchone()[0],
    }
    if enforcement["co_applied"] == 0:
        raise RuntimeError(
            "Zero 'Continuing Obligation(s) Applied' actions — the bulk "
            "action vocabulary changed; do not publish an empty panel"
        )
    return enforcement


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print("Building public/data:")
    write(OUT_DIR / "sites.json", build_sites(conn))
    write(OUT_DIR / "events.json", build_events(conn))
    write(OUT_DIR / "pfas.json", build_pfas(conn))
    write(OUT_DIR / "summary.json", build_summary(conn))
    # County outline for the widget map: verbatim copy of the committed
    # boundary (Census TIGERweb, GEOID 55073), so the widget serves it
    # like any other data file. Byte-identical copy keeps the quiet-repo
    # rule intact.
    (OUT_DIR / "county.geojson").write_text(
        (REPO_ROOT / "data" / "marathon_county.geojson").read_text(encoding="utf-8"),
        encoding="utf-8",
    )
    print(f"  wrote {(OUT_DIR / 'county.geojson').relative_to(REPO_ROOT)}")
    conn.close()


if __name__ == "__main__":
    sys.exit(main())
