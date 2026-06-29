#!/usr/bin/env python3
"""Convert Rack_Fender_Kickstand_Compatibility_202507update.xlsx into data/data.json + data/images/."""
import re


def slugify(text):
    text = text.strip().lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def sanitize_sku(raw_sku):
    text = str(raw_sku).strip()
    text = re.sub(r"[^A-Za-z0-9]+", "-", text)
    return text.strip("-")


def parse_compat_cell(raw):
    if raw is None:
        raise ValueError("compatibility cell is empty")
    text = str(raw).strip()
    if text == "\xad":
        return {"status": "accessory"}
    if text == "X":
        return {"status": "no"}
    if text.startswith("○"):
        rest = text[1:].strip()
        if not rest:
            return {"status": "yes"}
        note = rest.lstrip("*").strip()
        note = note.replace("moutning", "mounting")
        return {"status": "yes", "note": note}
    raise ValueError(f"unrecognized compatibility symbol: {raw!r}")
