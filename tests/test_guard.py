"""Mass-change breaker (ingest/guard.py) and its wiring into both pulls.

Run: python -m unittest discover -s tests -v

The end-to-end cases replay the committed database's own state as the
"live" DNR response, so they need no network: an unchanged replay must
pass as a quiet night, and a replay with one county's layer missing (a
partial response) must fail before anything is written.
"""

import shutil
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

from ingest import guard, pull_arcgis, pull_pfas  # noqa: E402

ARCGIS_LIMITS = {"floor": 10, "share": 0.10}


class TrippedTests(unittest.TestCase):
    def test_normal_night_passes(self):
        self.assertEqual(guard.tripped({"k": 3}, {"k": 698}, **ARCGIS_LIMITS), [])

    def test_small_layer_absorbs_up_to_the_floor(self):
        # Lincoln's six open cases could all close in one night.
        self.assertEqual(guard.tripped({"k": 6}, {"k": 6}, **ARCGIS_LIMITS), [])

    def test_wiped_layer_trips(self):
        self.assertEqual(
            guard.tripped({"k": 698}, {"k": 698}, **ARCGIS_LIMITS),
            [("k", 698, 698)],
        )

    def test_share_scales_with_large_layers(self):
        stored = {"k": 698}  # 10% = 69.8
        self.assertEqual(guard.tripped({"k": 69}, stored, **ARCGIS_LIMITS), [])
        self.assertEqual(len(guard.tripped({"k": 70}, stored, **ARCGIS_LIMITS)), 1)

    def test_key_with_nothing_stored_uses_the_floor(self):
        self.assertEqual(guard.tripped({"k": 10}, {}, **ARCGIS_LIMITS), [])
        self.assertEqual(len(guard.tripped({"k": 11}, {}, **ARCGIS_LIMITS)), 1)


class CheckTests(unittest.TestCase):
    def test_raises_without_the_flag(self):
        with self.assertRaisesRegex(RuntimeError, "nothing was written"):
            guard.check({"k": 50}, {"k": 60}, describe=str, argv=[],
                        **ARCGIS_LIMITS)

    def test_operator_flag_lets_it_through(self):
        guard.check({"k": 50}, {"k": 60}, describe=str,
                    argv=[guard.ACCEPT_FLAG], **ARCGIS_LIMITS)


class EndToEnd(unittest.TestCase):
    """Replays against a scratch copy of data/cleanup.db."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db = Path(self.tmp.name) / "cleanup.db"
        shutil.copy(REPO_ROOT / "data" / "cleanup.db", self.db)

    def tearDown(self):
        self.tmp.cleanup()

    def snapshot(self):
        conn = sqlite3.connect(self.db)
        try:
            return [
                conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
                for t in ("map_state", "event", "pfas_system", "pfas_event")
            ]
        finally:
            conn.close()

    def stored_map_layers(self):
        conn = sqlite3.connect(self.db)
        try:
            live = {layer_id: {} for layer_id in pull_arcgis.EVENT_TYPES}
            for row in conn.execute(
                "SELECT layer_id, detail_seq_no, activity_number, activity_name, "
                "loc_addr, loc_city, start_date, end_date, parent_dsn, "
                "parent_brrts_no, parent_name FROM map_state"
            ):
                live[row[0]][row[1]] = dict(zip(
                    ("activity_number", "activity_name", "loc_addr", "loc_city",
                     "start_date", "end_date", "parent_dsn", "parent_brrts_no",
                     "parent_name"),
                    row[2:],
                ))
            return live
        finally:
            conn.close()

    def stored_pfas(self):
        conn = sqlite3.connect(self.db)
        try:
            return {
                row[0]: dict(zip(
                    ("pws_name", "city", "county", "sample_status",
                     "sample_date", "sample_results", "lat", "lon"),
                    row[1:],
                ))
                for row in conn.execute(
                    "SELECT pws_id, pws_name, city, county, sample_status, "
                    "sample_date, sample_results, lat, lon FROM pfas_system"
                )
            }
        finally:
            conn.close()

    def run_arcgis(self, live):
        with mock.patch.object(pull_arcgis, "DB_PATH", self.db), \
             mock.patch.object(pull_arcgis, "fetch_layer",
                               side_effect=lambda layer_id: live[layer_id]), \
             mock.patch.object(sys, "argv", ["pull_arcgis.py"]):
            pull_arcgis.main()

    def run_pfas(self, live):
        with mock.patch.object(pull_pfas, "DB_PATH", self.db), \
             mock.patch.object(pull_pfas, "fetch_systems", return_value=live), \
             mock.patch.object(sys, "argv", ["pull_pfas.py"]):
            pull_pfas.main()

    def test_arcgis_quiet_night_passes(self):
        before = self.snapshot()
        self.run_arcgis(self.stored_map_layers())
        self.assertEqual(self.snapshot(), before)

    def test_arcgis_partial_response_writes_nothing(self):
        live = self.stored_map_layers()
        # Marathon's closed layer comes back empty.
        live[103] = {
            dsn: r for dsn, r in live[103].items()
            if r["activity_number"][2:4] != "37"
        }
        before = self.snapshot()
        with self.assertRaisesRegex(RuntimeError, "Marathon County, layer 103"):
            self.run_arcgis(live)
        self.assertEqual(self.snapshot(), before)

    def test_pfas_quiet_night_passes(self):
        before = self.snapshot()
        self.run_pfas(self.stored_pfas())
        self.assertEqual(self.snapshot(), before)

    def test_pfas_partial_response_writes_nothing(self):
        live = self.stored_pfas()
        marathon = sorted(p for p, r in live.items() if r["county"] == "marathon")
        for pws_id in marathon[:6]:  # 6 of 16 go missing
            del live[pws_id]
        before = self.snapshot()
        with self.assertRaisesRegex(RuntimeError, "Marathon County PFAS systems"):
            self.run_pfas(live)
        self.assertEqual(self.snapshot(), before)


if __name__ == "__main__":
    unittest.main()
