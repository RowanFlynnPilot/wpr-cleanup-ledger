"""Shared HTTP session for DNR pulls: ride out transient failures.

dnrmaps.wi.gov intermittently refuses connections around the nightly
window (observed Aug 2026: connect timeouts on the first request killed
the runs of Aug 17 and Aug 19 while Aug 18 sailed through). Every DNR
request therefore goes through one session that retries connect errors
and 5xx/429 responses with exponential backoff. A genuine outage still
fails loudly after the last attempt — and the second cron entry in
nightly.yml gives the pipeline a same-day recovery window, which the
quiet-repo rule makes free when the first run already succeeded.

The retried POST (the PFAS spatial filter) is a pure query, so retrying
it is as safe as a GET.
"""

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# (connect, read) seconds per attempt; retries handle the rest.
TIMEOUT = (20, 90)


def make_session() -> requests.Session:
    retry = Retry(
        total=4,
        backoff_factor=8,  # sleeps roughly 8s / 16s / 32s between attempts
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET", "POST"],
    )
    session = requests.Session()
    session.mount("https://", HTTPAdapter(max_retries=retry))
    return session
