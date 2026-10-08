"""Bounded, non-destructive CSV inspection with explicit detection rules."""

import csv
import hashlib
import io
import math

from app.services.errors import ServiceError


MAX_CSV_BYTES = 10 * 1024 * 1024
MAX_CSV_ROWS = 50_000
REQUIRED_COLUMNS = ("period_start", "period_end", "volume_m3", "electricity_kwh", "pump_hours")
NUMERIC_COLUMNS = ("volume_m3", "electricity_kwh", "pump_hours", "mixing_hours",
                   "chemical_dose_mg_per_l", "water_turbidity_ntu", "ph_level")


def _quartile(values, percentile):
    position = (len(values) - 1) * percentile
    lower = math.floor(position)
    fraction = position - lower
    return values[lower] + fraction * (values[min(lower + 1, len(values) - 1)] - values[lower])


def inspect_csv(raw):
    if len(raw) > MAX_CSV_BYTES:
        raise ServiceError(413, "csv_too_large", "CSV files are limited to 10 MB.")
    try:
        decoded = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise ServiceError(422, "invalid_csv_encoding", "CSV must use UTF-8 encoding.") from None
    if "\x00" in decoded:
        raise ServiceError(422, "invalid_csv", "CSV cannot contain null bytes.")
    reader = csv.reader(io.StringIO(decoded, newline=""), strict=True)
    try:
        header = next(reader, None)
        if not header or any(not item.strip() for item in header) or len(set(header)) != len(header):
            raise ServiceError(422, "invalid_csv_header", "CSV needs unique, nonempty column names.")
        missing = dict.fromkeys(header, 0)
        numeric = {field: [] for field in header}
        seen, duplicates, invalid, rows = set(), [], [], 0
        intervals = {}
        critical = 0
        for row in reader:
            rows += 1
            if rows > MAX_CSV_ROWS:
                raise ServiceError(422, "csv_too_many_rows", "CSV files are limited to 50,000 rows.")
            row_number = rows + 1
            if len(row) != len(header):
                raise ServiceError(422, "invalid_csv_shape", "Every CSV row must match its header.",
                                   [{"field": "rows", "row": row_number, "message": "Column count mismatch."}])
            signature = tuple(row)
            if signature in seen:
                duplicates.append(row_number)
            seen.add(signature)
            values = dict(zip(header, row))
            for field, original in values.items():
                value = original.strip()
                if not value:
                    missing[field] += 1
                    if field in REQUIRED_COLUMNS:
                        critical += 1
                    continue
                try:
                    parsed = float(value)
                except ValueError:
                    if field in NUMERIC_COLUMNS:
                        invalid.append({"row": row_number, "field": field, "reason": "Expected a number."})
                    continue
                if not math.isfinite(parsed):
                    invalid.append({"row": row_number, "field": field, "reason": "Nonfinite number."})
                    continue
                if field in NUMERIC_COLUMNS and parsed < 0:
                    invalid.append({"row": row_number, "field": field, "reason": "Negative measurement."})
                numeric[field].append((row_number, parsed))
            if "period_start" in values and "period_end" in values and values["period_start"].strip() and values["period_end"].strip():
                from app.domain.scenarios import parse_instant
                try:
                    start = parse_instant(values["period_start"], "period_start")
                    end = parse_instant(values["period_end"], "period_end")
                    if end <= start:
                        raise ValueError("Invalid period order.")
                    equipment = values.get("equipment_id", "plant")
                    intervals.setdefault(equipment, []).append((start, end, row_number))
                except (ServiceError, ValueError):
                    invalid.append({"row": row_number, "field": "period", "reason": "Invalid or unordered timezone-aware period."})
    except csv.Error:
        raise ServiceError(422, "invalid_csv", "CSV could not be parsed.") from None
    for entries in intervals.values():
        latest_end = None
        for start, end, row_number in sorted(entries):
            if latest_end is not None and start < latest_end:
                invalid.append({"row": row_number, "field": "period", "reason": "Overlapping or duplicate reporting period."})
            latest_end = max(latest_end, end) if latest_end is not None else end
    outliers = {}
    for field, entries in numeric.items():
        if len(entries) < 4:
            continue
        values = sorted(value for _, value in entries)
        q1, q3 = _quartile(values, .25), _quartile(values, .75)
        low, high = q1 - 1.5 * (q3 - q1), q3 + 1.5 * (q3 - q1)
        flagged = [{"row": row, "value": value, "lower_bound": low, "upper_bound": high}
                   for row, value in entries if value < low or value > high]
        if flagged:
            outliers[field] = flagged
    return {"row_count": rows, "column_count": len(header), "columns": header,
            "missing_values": missing, "critical_missing_values": critical,
            "missing_columns": [field for field in REQUIRED_COLUMNS if field not in header],
            "duplicate_rows": duplicates, "invalid_values": invalid, "outliers": outliers,
            "outlier_rule": "Tukey 1.5 IQR; linear-interpolated quartiles; rows retained",
            "content_hash": hashlib.sha256(raw).hexdigest(), "schema_version": "plant-csv-v1"}
