#!/usr/bin/env python3
"""
next_friday.py — Calculate the date of next Friday from today (or a given date).

Usage:
    python3 next_friday.py
    python3 next_friday.py 2026-04-21
"""

import sys
from datetime import date, timedelta


def next_friday(from_date: date | None = None) -> date:
    """Return the date of the next Friday on or after from_date."""
    d = from_date or date.today()
    days_ahead = 4 - d.weekday()  # Friday = weekday 4
    if days_ahead <= 0:
        days_ahead += 7
    return d + timedelta(days=days_ahead)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        base = date.fromisoformat(sys.argv[1])
    else:
        base = date.today()

    friday = next_friday(base)
    saturday = friday + timedelta(days=1)

    print(f"Base date:  {base}")
    print(f"Checkin:    {friday}  (Friday)")
    print(f"Checkout:   {saturday}  (Saturday)")
