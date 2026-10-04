#!/usr/bin/env python3
"""Read-only Academy migration verifier.

The committed data/academy/*.generated.json files are the release input.
This script rechecks that every migrated source URL is still reachable and
emits a compact report without mutating PsiTrends or Holistic House.
"""
import json
import ssl
import sys
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
records = json.loads((ROOT / "data/academy/sources.generated.json").read_text(encoding="utf-8"))
ctx = ssl._create_unverified_context()
failures = []

for record in records:
    url = record["sourceUrl"]
    try:
        req = Request(url, headers={"User-Agent": "HolisticHouseAcademyAudit/1.0"})
        with urlopen(req, timeout=20, context=ctx) as response:
            if response.status != 200:
                failures.append((url, response.status))
    except Exception as exc:
        failures.append((url, str(exc)))

print(f"Academy source records: {len(records)}")
print(f"Reachable: {len(records) - len(failures)}")
print(f"Failures: {len(failures)}")
for url, error in failures:
    print(f"FAIL {url}: {error}")

sys.exit(1 if failures else 0)
