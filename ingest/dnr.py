"""Shared HTTP session for DNR pulls: ride out transient failures.

Every DNR request goes through one session that retries connect errors
and 5xx/429 responses with exponential backoff, for the blips a runner
that CAN reach DNR still hits now and then. A genuine outage still fails
loudly after the last attempt.

What these retries cannot fix (and what the Aug 2026 version of this
note mistook for DNR flakiness) is a runner the state network refuses
outright: some GitHub runner addresses can't open a connection to any
wi.gov host however long they wait. That is handled a level up, where
.github/workflows/dnr-attempt.yml checks reachability first and hands
the job to a fresh runner. See its header for the Sept 2026 probe.

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
