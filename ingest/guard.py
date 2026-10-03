"""Mass-change breaker shared by the nightly pulls.

A normal night moves a handful of records across the whole coverage area
(through Oct 2026 the busiest night emitted 3 events region-wide). A
county layer that loses or gains dozens of records in one pull is either
a partial DNR response or a genuine mass change, and in both cases a
human should look before the internal tip sheet fills with phantom
events and the stored state is overwritten. The breaker stops the pull
before anything is written. Nothing is lost: the next run diffs against
the same untouched state.

Once a human has confirmed on the DNR map that the change is real (a
batch reclassification, say), rerun the script locally with
--accept-mass-change and commit the result.
"""

import sys

ACCEPT_FLAG = "--accept-mass-change"


def tripped(changes: dict, stored: dict, *, floor: int, share: float) -> list:
    """[(key, changed, stored_count)] for every key whose change count
    exceeds max(floor, share * stored_count), in key order. The floor
    lets small layers absorb a normal night; the share scales with the
    big ones."""
    return [
        (key, n, stored.get(key, 0))
        for key, n in sorted(changes.items())
        if n > max(floor, share * stored.get(key, 0))
    ]


def check(changes: dict, stored: dict, *, floor: int, share: float,
          describe, argv=None) -> None:
    """Raise unless nothing tripped or the operator passed ACCEPT_FLAG.
    `describe(key)` renders a key for the message."""
    hits = tripped(changes, stored, floor=floor, share=share)
    if not hits:
        return
    detail = "\n".join(
        f"  {describe(key)}: {n} records changed ({s} stored)"
        for key, n, s in hits
    )
    if ACCEPT_FLAG in (sys.argv[1:] if argv is None else argv):
        print(f"Mass change accepted by operator ({ACCEPT_FLAG}):\n{detail}")
        return
    raise RuntimeError(
        "Mass-change breaker tripped; nothing was written.\n"
        f"{detail}\n"
        "A normal night changes a handful of records region-wide. Either DNR "
        "returned a partial response (the next run retries on its own) or "
        "the layer genuinely changed en masse: confirm on the DNR map, then "
        f"rerun this script locally with {ACCEPT_FLAG} and commit."
    )
