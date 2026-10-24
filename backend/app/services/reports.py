"""Deterministic report models and PDF/CSV renderers over stored, immutable results.

A report model is an ordered list of sections, each holding paragraphs and
tables of raw cells. The preview, CSV and PDF all render the same model, so a
reader sees exactly what is downloaded. No value is calculated here beyond
selecting and labelling stored results; a missing scientific value is written
as "Not estimable" (never zero).
"""

import csv
import io
import math

from app.integrations.gemini import approved_output

LABEL = "Simulated estimates · offline plant model — not measured or validated results"
NOT_ESTIMABLE = "Not estimable"
NOT_AVAILABLE = "Not available"
SECTION_TITLES = {
    "summary": "Summary",
    "inputs": "Inputs and assumptions",
    "results": "Results by run",
    "comparison": "Scenario comparison",
    "methodology": "Methodology and limitations",
}
SELECTABLE_SECTIONS = ("summary", "inputs", "results", "comparison")
METHOD_NOTES = [
    "Energy (kWh) = Σ equipment power (kW) × load multiplier × operating hours. Pumps run at a load "
    "multiplier of 1.0; flow rate is validated against capacity and volume but does not change energy.",
    "Energy intensity (kWh/m³) = total energy ÷ treated volume.",
    "Electricity-associated emissions = total energy × the selected grid emission factor (kg per kWh) for "
    "the stated region, year, gas basis and accounting method.",
    "Operating cost (PHP) = energy × tariff + chemical mass × chemical price + labor + maintenance + other "
    "non-energy costs, where chemical mass (kg) = dose (mg/L) × volume (m³) ÷ 1000.",
    "Ecology: no approved ecological model exists, so downstream ecosystem stress is reported as not "
    "estimable. This is distinct from zero impact or a finding of safety.",
]
INPUT_ROWS = (
    ("Treated volume", ("volume_m3",), "m³"),
    ("Period start", ("period_start",), None),
    ("Period end", ("period_end",), None),
    ("Currency", ("currency",), None),
    ("Grid region", ("grid_region",), None),
    ("Flow rate", ("flow_rate_m3_per_hour",), "m³/h"),
    ("Pump duty", ("pump_duty_hours",), "h"),
    ("Mixing time", ("mixing_hours",), "h"),
    ("Mixing load multiplier", ("mixing_load_multiplier",), None),
    ("Chemical dose", ("chemical_dose_mg_per_l",), "mg/L"),
    ("Technology version", ("technology", "version_id"), None),
    ("Technology evidence status", ("technology", "evidence_status"), None),
    ("Pump power", ("technology", "pump_power_kw"), "kW"),
    ("Mixer power", ("technology", "mixer_power_kw"), "kW"),
    ("Technology capacity", ("technology", "capacity_m3_per_hour"), "m³/h"),
    ("Grid factor version", ("factor", "version_id"), None),
    ("Grid factor", ("factor", "kg_per_kwh"), "kg per kWh"),
    ("Grid factor gas basis", ("factor", "gas_basis"), None),
    ("Grid factor year", ("factor", "reporting_year"), None),
    ("Grid factor method", ("factor", "factor_method"), None),
    ("Grid factor evidence status", ("factor", "evidence_status"), None),
    ("Electricity tariff", ("costs", "tariff_php_per_kwh"), "PHP/kWh"),
    ("Chemical price", ("costs", "chemical_price_php_per_kg"), "PHP/kg"),
    ("Labor", ("costs", "labor_php"), "PHP"),
    ("Maintenance", ("costs", "maintenance_php"), "PHP"),
    ("Other non-energy costs", ("costs", "other_nonenergy_php"), "PHP"),
)
METRIC_NAMES = {"energy": "Energy", "carbon": "Electricity-associated emissions",
                "economics": "Operating cost", "ecology": "Downstream ecosystem stress"}


def _lookup(value, path):
    for key in path:
        if not isinstance(value, dict) or key not in value:
            return None
        value = value[key]
    return value


def _value(value, status="valid"):
    """Never coerce a missing estimate to zero."""
    if status == "not_estimable":
        return NOT_ESTIMABLE
    if value is None:
        return NOT_AVAILABLE
    return value


def run_label(run):
    return f"{run['scenario_name']} · rev {run['revision_no']} · {run['kind']} · run {str(run['id'])[:8]}"


def _carbon_value(results):
    carbon = results.get("carbon") or {}
    return carbon.get("emissions_kg_co2e", carbon.get("emissions_kg_co2")), carbon.get("unit")


def _metric_rows(run, results):
    rows = []
    for metric in results.get("metrics", []):
        rows.append([run_label(run), METRIC_NAMES.get(metric["key"], metric["key"]),
                     _value(metric.get("value"), metric.get("status")), metric.get("unit") or "",
                     metric.get("status")])
    return rows


def _result_rows(results):
    rows = []
    energy = results.get("energy")
    if energy:
        rows.append(["Total energy", _value(energy.get("total_kwh")), "kWh"])
        rows.append(["Energy intensity", _value(energy.get("energy_intensity_kwh_per_m3")), "kWh/m³"])
    carbon = results.get("carbon")
    if carbon:
        value, unit = _carbon_value(results)
        rows.append(["Electricity-associated emissions", _value(value), unit or ""])
        rows.append(["Grid factor applied", _value(carbon.get("factor_kg_per_kwh")), "kg per kWh"])
    economics = results.get("economics")
    if economics:
        for label, key in (("Electricity cost", "electricity_cost_php"), ("Chemical cost", "chemical_cost_php"),
                           ("Labor cost", "labor_cost_php"), ("Maintenance cost", "maintenance_cost_php"),
                           ("Other non-energy cost", "other_cost_php"), ("Total operating cost", "total_opex_php")):
            rows.append([label, _value(economics.get(key)), "PHP"])
        rows.append(["Chemical used", _value(economics.get("chemical_kg_used")), "kg"])
    ecology = results.get("ecology")
    if ecology:
        rows.append(["Downstream ecosystem stress", _value(ecology.get("value"), ecology.get("status")),
                     ecology.get("unit") or ""])
    return rows


def _section(key, paragraphs=(), tables=()):
    return {"key": key, "title": SECTION_TITLES[key], "paragraphs": list(paragraphs), "tables": list(tables)}


def _table(caption, columns, rows):
    return {"caption": caption, "columns": list(columns), "rows": [list(row) for row in rows]}


def build_report_model(report, runs, results_by_run, comparison=None):
    """Build the ordered report model from stored runs and results only."""
    sections = report["params"]["sections"]
    run_ids = report["run_ids"]
    ordered = [(runs[run_id], results_by_run[run_id]) for run_id in run_ids]
    model_sections = []
    if "summary" in sections:
        rows = [row for run, results in ordered for row in _metric_rows(run, results)]
        paragraphs = [f"{len(ordered)} stored run{'s' if len(ordered) != 1 else ''} from the offline plant model. "
                      "Every figure is copied from frozen simulation results with its unit and status."]
        if comparison and comparison.get("net_savings_php") is not None:
            paragraphs.append(f"Net operating savings (baseline minus intervention): "
                              f"{comparison['net_savings_php']} PHP. Negative savings mean a cost increase.")
        model_sections.append(_section("summary", paragraphs,
                                       [_table("Headline metrics", ("Run", "Metric", "Value", "Unit", "Status"), rows)]))
    if "inputs" in sections:
        tables = []
        for run, _ in ordered:
            parameters = run["frozen_inputs"]["parameters"]
            rows = [[label, _value(_lookup(parameters, path)), unit or ""] for label, path, unit in INPUT_ROWS
                    if _lookup(parameters, path) is not None or path[0] != "factor"]
            tables.append(_table(run_label(run), ("Input", "Value", "Unit"), rows))
        model_sections.append(_section("inputs", ["Frozen inputs exactly as submitted for each run."], tables))
    if "results" in sections:
        tables = [_table(run_label(run), ("Result", "Value", "Unit"), _result_rows(results)) for run, results in ordered]
        model_sections.append(_section("results", [], tables))
    if "comparison" in sections and comparison:
        baseline, intervention = runs[comparison["baseline_run_id"]], runs[comparison["intervention_run_id"]]
        rows = []
        for delta in comparison["deltas"]:
            not_estimable = "not_estimable" in (delta["baseline_status"], delta["intervention_status"])
            status = "not_estimable" if not_estimable else "valid"
            rows.append([METRIC_NAMES.get(delta["key"], delta["key"]),
                         _value(delta["baseline"], delta["baseline_status"]),
                         _value(delta["intervention"], delta["intervention_status"]),
                         _value(delta["delta"], status), _value(delta["delta_pct"], status), delta["unit"] or ""])
        paragraphs = [f"Baseline: {run_label(baseline)}. Intervention: {run_label(intervention)}.",
                      f"Compatible boundary: {comparison['volume_m3']} m³, {comparison['period_start']} to "
                      f"{comparison['period_end']}, {comparison['currency']}. Delta = intervention − baseline."]
        model_sections.append(_section("comparison", paragraphs, [_table(
            "Baseline versus intervention",
            ("Metric", "Baseline", "Intervention", "Delta", "Delta %", "Unit"), rows)]))
    limitations = []
    provenance_rows = []
    for run, results in ordered:
        for limitation in approved_output(results).limitations + results.get("warnings", []):
            if limitation not in limitations:
                limitations.append(limitation)
        provenance = results.get("provenance", {})
        factor = provenance.get("factor") or {}
        snapshot_hash = results.get("snapshot_hash") or run.get("snapshot_hash") or ""
        provenance_rows.append([run_label(run), run["id"], snapshot_hash[:16],
                                results.get("code_version") or run.get("code_version"),
                                ", ".join(f"{key}: {value}" for key, value in sorted((provenance.get("model_versions") or {}).items())),
                                provenance.get("technology_evidence_status") or "unverified",
                                factor.get("source_ref") or NOT_AVAILABLE])
    model_sections.append(_section("methodology", METHOD_NOTES + ["Limitations:"] + limitations, [_table(
        "Run provenance", ("Run", "Run ID", "Snapshot hash", "Code version", "Model versions",
                           "Technology evidence", "Grid factor source"), provenance_rows)]))
    return {"id": report["id"], "title": report["title"], "report_type": report["report_type"],
            "created_at": report["created_at"], "created_by_name": report.get("created_by_name"),
            "label": LABEL, "run_ids": run_ids, "formats": report["params"]["formats"],
            "sections": model_sections}


def build_public_model(publication):
    """A downloadable view of a published snapshot, from its redacted payload only."""
    snapshot = publication["snapshot_data"]
    boundary = snapshot.get("boundary", {})
    rows = [[METRIC_NAMES.get(metric.get("key"), metric.get("key")),
             _value(metric.get("value"), metric.get("status")), metric.get("unit") or "", metric.get("status")]
            for metric in snapshot.get("metrics", [])]
    provenance = snapshot.get("provenance", {})
    summary = {"key": "summary", "title": "Published results", "paragraphs": [publication.get("summary") or ""],
               "tables": [_table("Metrics", ("Metric", "Value", "Unit", "Status"), rows),
                          _table("Boundary", ("Field", "Value"),
                                 [[key.replace("_", " "), value] for key, value in boundary.items()])]}
    method = {"key": "methodology", "title": SECTION_TITLES["methodology"],
              "paragraphs": METHOD_NOTES + ["Limitations:"] + list(snapshot.get("limitations", [])),
              "tables": [_table("Evidence", ("Field", "Value"),
                                [[key.replace("_", " "), value] for key, value in provenance.items()])]}
    return {"id": publication["slug"], "title": publication["title"], "report_type": "public_snapshot",
            "created_at": publication.get("published_at"), "created_by_name": None,
            "label": LABEL + " · reviewed public snapshot (not a regulatory approval)",
            "run_ids": [], "formats": ["pdf", "csv"], "sections": [summary, method]}


def display(value):
    """Human formatting for previews and PDFs; CSV keeps raw values."""
    if isinstance(value, bool):
        return "Yes" if value else "No"
    if isinstance(value, int):
        # Integers here are counts, years and revision numbers; no separators.
        return str(value)
    if isinstance(value, float):
        if not math.isfinite(value):
            return NOT_AVAILABLE
        text = f"{value:,.4f}".rstrip("0").rstrip(".")
        return text if text not in ("", "-0") else "0"
    return str(value)


FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def csv_cell(value):
    """Neutralize spreadsheet formula injection in text cells (OWASP)."""
    if value is None:
        return ""
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return repr(value) if isinstance(value, float) else str(value)
    text = str(value)
    return "'" + text if text.startswith(FORMULA_PREFIXES) else text


def render_csv(model):
    buffer = io.StringIO(newline="")
    writer = csv.writer(buffer, lineterminator="\r\n")
    for row in (("report", model["title"]), ("report_id", model["id"]), ("label", model["label"]),
                ("created_at", model["created_at"])):
        writer.writerow([csv_cell(cell) for cell in row])
    for section in model["sections"]:
        for table in section["tables"]:
            writer.writerow([])
            writer.writerow([csv_cell(section["title"]), csv_cell(table["caption"])])
            writer.writerow([csv_cell(column) for column in table["columns"]])
            for row in table["rows"]:
                writer.writerow([csv_cell(cell) for cell in row])
        if section["key"] == "methodology":
            writer.writerow([])
            writer.writerow([csv_cell(section["title"]), "notes"])
            for paragraph in section["paragraphs"]:
                writer.writerow([csv_cell(paragraph)])
    return ("﻿" + buffer.getvalue()).encode("utf-8")


def render_pdf(model):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import LongTable, Paragraph, SimpleDocTemplate, Spacer, TableStyle
    from xml.sax.saxutils import escape

    styles = getSampleStyleSheet()
    body = ParagraphStyle("pv-body", parent=styles["BodyText"], fontSize=9, leading=12)
    cell = ParagraphStyle("pv-cell", parent=body, fontSize=8, leading=10)
    head = ParagraphStyle("pv-head", parent=cell, fontName="Helvetica-Bold")
    title = ParagraphStyle("pv-title", parent=styles["Title"], fontSize=18, leading=22, alignment=0)
    h2 = ParagraphStyle("pv-h2", parent=styles["Heading2"], fontSize=13, leading=16, spaceBefore=10)
    caption = ParagraphStyle("pv-caption", parent=body, fontName="Helvetica-Bold", spaceBefore=6)

    def text(value, style=body):
        # Paragraph markup is XML; escape every stored string.
        return Paragraph(escape(display(value)), style)

    story = [text(model["title"], title),
             text(f"Report {model['id']} · created {model['created_at']}"
                  + (f" by {model['created_by_name']}" if model.get("created_by_name") else ""), body),
             Spacer(1, 4 * mm)]
    width = A4[0] - 30 * mm
    for number, section in enumerate(model["sections"], start=1):
        story.append(text(f"{number} · {section['title']}", h2))
        for paragraph in section["paragraphs"]:
            story.append(text(paragraph, body))
        for table in section["tables"]:
            story.append(text(table["caption"], caption))
            columns = len(table["columns"])
            data = [[text(column, head) for column in table["columns"]]]
            data += [[text(value, cell) for value in row] for row in table["rows"]]
            style = [("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EEF3F1")),
                     ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#C9D6D1")),
                     ("VALIGN", (0, 0), (-1, -1), "TOP")]
            if not table["rows"]:
                data.append([text("No rows.", cell)] + [""] * (columns - 1))
                style.append(("SPAN", (0, 1), (-1, 1)))
            grid = LongTable(data, colWidths=[width / columns] * columns, repeatRows=1)
            grid.setStyle(TableStyle(style))
            story += [grid, Spacer(1, 3 * mm)]

    def decorate(canvas, document):
        canvas.saveState()
        canvas.setFont("Helvetica-Bold", 8)
        canvas.setFillColor(colors.HexColor("#1F5F8B"))
        canvas.drawString(15 * mm, A4[1] - 10 * mm, LABEL)
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#5B6B66"))
        canvas.drawString(15 * mm, 8 * mm, f"Pax Virentia · {model['title']}"[:110])
        canvas.drawRightString(A4[0] - 15 * mm, 8 * mm, f"Page {document.page}")
        canvas.restoreState()

    buffer = io.BytesIO()
    document = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=15 * mm, rightMargin=15 * mm,
                                 topMargin=16 * mm, bottomMargin=15 * mm, title=model["title"],
                                 author="Pax Virentia", subject=LABEL, invariant=1)
    document.build(story, onFirstPage=decorate, onLaterPages=decorate)
    return buffer.getvalue()


def page_count(model):
    """Preview pages: one per section."""
    return len(model["sections"])
