-- wpr-cleanup-ledger schema
-- One database: data/cleanup.db
-- Bulk tables (activity, party, action, impact, substance) are replaced wholesale
-- by ingest/ingest_bulk.py each quarter. map_state and event are maintained
-- nightly by ingest/pull_arcgis.py. meta holds pipeline bookkeeping.

-- ---------------------------------------------------------------------------
-- Quarterly bulk spine (source: BRRTS bulk data zip, Marathon County only)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS activity (
    detail_seq_no           INTEGER PRIMARY KEY,
    site_id                 INTEGER NOT NULL,
    activity_number         TEXT NOT NULL UNIQUE,  -- 10 digits; digits 3-4 = '37' (Marathon)
    activity_display_number TEXT NOT NULL,         -- e.g. 03-37-153276
    activity_name           TEXT NOT NULL,
    activity_type           TEXT NOT NULL,         -- LUST / ERP / SPILL / NO ACTION REQUIRED / OFF-SITE / ...
    act_code                TEXT NOT NULL,
    address                 TEXT,
    muni                    TEXT,
    zip                     TEXT,
    status                  TEXT,                  -- OPEN / CLOSED / CONDITIONALLY CLOSED / '' (spills, NAR)
    start_date              TEXT,
    end_date                TEXT,
    lat                     REAL,
    lon                     REAL,
    co_flag                 INTEGER NOT NULL,      -- continuing obligations apply
    co_contamination_flag   INTEGER NOT NULL,
    offsite_impact_flag     INTEGER NOT NULL,
    row_impact_flag         INTEGER NOT NULL,
    pfas_flag               INTEGER NOT NULL,
    drycleaner_flag         INTEGER NOT NULL,
    petrol_ust_flag         INTEGER NOT NULL,
    vple_coc_flag           INTEGER NOT NULL,
    sfr_flag                INTEGER NOT NULL       -- state-funded response
);

CREATE INDEX IF NOT EXISTS idx_activity_co     ON activity (co_flag);
CREATE INDEX IF NOT EXISTS idx_activity_muni   ON activity (muni);
CREATE INDEX IF NOT EXISTS idx_activity_status ON activity (status);

CREATE TABLE IF NOT EXISTS party (
    detail_seq_no INTEGER NOT NULL REFERENCES activity (detail_seq_no),
    role          TEXT NOT NULL,   -- Responsible Party / Owner / Consultant / DNR File Contact / ...
    full_name     TEXT NOT NULL,
    is_org        INTEGER NOT NULL,
    city          TEXT,
    state         TEXT
);

CREATE INDEX IF NOT EXISTS idx_party_activity ON party (detail_seq_no);

CREATE TABLE IF NOT EXISTS action (
    detail_seq_no INTEGER NOT NULL REFERENCES activity (detail_seq_no),
    action_date   TEXT,
    action_code   TEXT,
    action_name   TEXT NOT NULL,
    action_desc   TEXT
);

CREATE INDEX IF NOT EXISTS idx_action_activity ON action (detail_seq_no);
CREATE INDEX IF NOT EXISTS idx_action_name     ON action (action_name);

CREATE TABLE IF NOT EXISTS impact (
    detail_seq_no  INTEGER NOT NULL REFERENCES activity (detail_seq_no),
    impact_code    TEXT,
    impact_desc    TEXT NOT NULL,
    potential_flag INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_impact_activity ON impact (detail_seq_no);

CREATE TABLE IF NOT EXISTS substance (
    detail_seq_no INTEGER NOT NULL REFERENCES activity (detail_seq_no),
    substance     TEXT NOT NULL,
    released_amt  TEXT,
    released_unit TEXT
);

CREATE INDEX IF NOT EXISTS idx_substance_activity ON substance (detail_seq_no);

-- ---------------------------------------------------------------------------
-- Nightly map state (source: RR Sites Map ArcGIS REST, Marathon County only)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS map_state (
    layer_id        INTEGER NOT NULL,  -- 101 open / 103 closed / 105 CO / 106 affected other / 220 affected by
    detail_seq_no   INTEGER NOT NULL,
    activity_number TEXT NOT NULL,
    activity_name   TEXT,
    loc_addr        TEXT,
    loc_city        TEXT,
    start_date      TEXT,
    end_date        TEXT,
    parent_dsn      INTEGER,           -- layer 220 only: source activity of the contamination
    parent_brrts_no TEXT,              -- layer 220 only
    parent_name     TEXT,              -- layer 220 only
    PRIMARY KEY (layer_id, detail_seq_no)
);

-- Editorial events emitted by the nightly diff. Feeds internal review,
-- never auto-publishes.
CREATE TABLE IF NOT EXISTS event (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    detected_at     TEXT NOT NULL,     -- UTC ISO-8601
    event_type      TEXT NOT NULL,     -- see EVENT_TYPES in ingest/pull_arcgis.py
    layer_id        INTEGER NOT NULL,
    detail_seq_no   INTEGER NOT NULL,
    activity_number TEXT NOT NULL,
    activity_name   TEXT,
    loc_addr        TEXT,
    loc_city        TEXT
);

-- ---------------------------------------------------------------------------
-- Pipeline bookkeeping
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,            -- bulk_extract_date / last_map_pull
    value TEXT NOT NULL
);

-- ---------------------------------------------------------------------------
-- Nightly municipal PFAS sampling state (source: DNR Municipal System PFAS
-- Sampling layer, filtered server-side to the Marathon County polygon in
-- data/marathon_county.geojson). Maintained by ingest/pull_pfas.py.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pfas_system (
    pws_id         TEXT PRIMARY KEY,   -- public water system ID (DWS Portal key)
    pws_name       TEXT NOT NULL,
    city           TEXT,               -- mailing city; display-only, never a join key
    county         TEXT,               -- slug from ingest/counties.py; assigned by point-in-polygon
    sample_status  TEXT,
    sample_date    TEXT,
    sample_results TEXT,               -- DNR ordinal category verbatim; NULL = no result posted
    lat            REAL NOT NULL,      -- PLSS section centroid, not the well
    lon            REAL NOT NULL
);

-- Editorial events emitted by the nightly PFAS diff. Same policy as event:
-- internal tip sheet, never auto-publishes.
CREATE TABLE IF NOT EXISTS pfas_event (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    detected_at TEXT NOT NULL,         -- UTC ISO-8601
    event_type  TEXT NOT NULL,         -- PFAS_SYSTEM_ADDED / PFAS_SYSTEM_REMOVED / PFAS_RESULT_CHANGED
    pws_id      TEXT NOT NULL,
    pws_name    TEXT NOT NULL,
    city        TEXT,
    old_results TEXT,
    new_results TEXT
);
