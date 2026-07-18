"""The coverage area: eight north-central Wisconsin counties, matching the
wpr-water tool (Marathon plus the seven surrounding/corridor counties added
July 2026). One source of truth — the ingest scripts, build_json.py, and
the public counties.json manifest all derive from this table.

Keys are the DNR county code: digits 3-4 of the 10-digit BRRTS activity
number (DNR's alphabetical county numbering; Marathon = 37). `geoid` is
the Census FIPS code used only to fetch the committed boundary files in
data/counties/<slug>.geojson. `bulk_name` is the county_name value in the
quarterly bulk extract. `min_activities` floors are set at roughly 60% of
the counts observed at the July 2026 expansion baseline (Langlade 544,
Lincoln 692, Marathon 2537, Oneida 1021, Portage 1398, Shawano 944,
Taylor 441, Wood 2214); a quarterly
extract far below its floor means the parse broke, not the county.

Adding a county later: add a row here, fetch its boundary file (see the
`source` property in any committed boundary for the exact TIGERweb query),
and let the county-aware baseline in the pull scripts load it silently.
"""

COUNTIES = {
    "37": {
        "slug": "marathon",
        "name": "Marathon",
        "bulk_name": "MARATHON",
        "geoid": "55073",
        "min_activities": 2000,
    },
    "34": {
        "slug": "langlade",
        "name": "Langlade",
        "bulk_name": "LANGLADE",
        "geoid": "55067",
        "min_activities": 300,
    },
    "35": {
        "slug": "lincoln",
        "name": "Lincoln",
        "bulk_name": "LINCOLN",
        "geoid": "55069",
        "min_activities": 400,
    },
    "44": {
        "slug": "oneida",
        "name": "Oneida",
        "bulk_name": "ONEIDA",
        "geoid": "55085",
        "min_activities": 600,
    },
    "50": {
        "slug": "portage",
        "name": "Portage",
        "bulk_name": "PORTAGE",
        "geoid": "55097",
        "min_activities": 800,
    },
    "59": {
        "slug": "shawano",
        "name": "Shawano",
        "bulk_name": "SHAWANO",
        "geoid": "55115",
        "min_activities": 550,
    },
    "61": {
        "slug": "taylor",
        "name": "Taylor",
        "bulk_name": "TAYLOR",
        "geoid": "55119",
        "min_activities": 250,
    },
    "72": {
        "slug": "wood",
        "name": "Wood",
        "bulk_name": "WOOD",
        "geoid": "55141",
        "min_activities": 1300,
    },
}

BULK_NAME_TO_CODE = {c["bulk_name"]: code for code, c in COUNTIES.items()}
SLUG_TO_CODE = {c["slug"]: code for code, c in COUNTIES.items()}


def county_code_of(activity_number: str) -> str:
    """Digits 3-4 of a 10-digit BRRTS activity number."""
    return activity_number[2:4]


def ordered_codes():
    """Marathon first (the founding county and widget default), then the
    rest alphabetically by name — the order the manifest and widget use."""
    rest = sorted(
        (code for code in COUNTIES if COUNTIES[code]["slug"] != "marathon"),
        key=lambda code: COUNTIES[code]["name"],
    )
    return ["37", *rest]
