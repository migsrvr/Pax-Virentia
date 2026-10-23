"""Fail-closed, structured Gemini explanations of immutable numerical results.

The provider may select and order approved clauses, never invent or paraphrase
facts. Number-set matching alone would permit assigning a cost to an emissions
metric; exact clause validation also protects units, attribution and caveats.
"""

from copy import deepcopy
import json
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.config import settings

Focus = Literal["general", "energy", "carbon", "economics", "ecology"]
PROMPT_VERSION = "grounded-clauses-v1"
SUMMARY = "Stored results describe an offline water-treatment scenario under fixed assumptions."
BASE_LIMITATIONS = [
    "AI explanations describe stored calculations and are not independent evidence or recommendations.",
    "Electricity-associated emissions do not represent a complete facility footprint or life-cycle assessment.",
]
UNVERIFIED = "Pax Silica and treatment technology specifications remain unverified; these calculations do not establish plant performance."
ECOLOGY_LIMITATION = "Ecology remains not_estimable: available evidence does not support an estimate. This is distinct from zero impact or a finding of safety."


class ExplanationOutput(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    summary: str = Field(min_length=1, max_length=1000)
    key_findings: list[str] = Field(min_length=1, max_length=20)
    limitations: list[str] = Field(min_length=1, max_length=20)
    cited_metric_keys: list[str] = Field(min_length=1, max_length=20)


def approved_output(results, focus: Focus = "general"):
    """Build clauses using only the published result metrics, with no arithmetic."""
    metrics = results["metrics"]
    selected = [m for m in metrics if focus == "general" or m["key"] == focus]
    if not selected:
        selected = metrics
    findings = []
    for metric in selected:
        key = metric["key"]
        if metric["status"] == "valid" and metric["value"] is not None:
            findings.append(f"{key}: {metric['value']} {metric['unit']} (stored calculated result).")
        else:
            findings.append(f"{key}: {metric['status']}; no numerical estimate is supported.")
    limitations = list(BASE_LIMITATIONS)
    provenance = results.get("provenance", {})
    if provenance.get("technology_evidence_status") != "verified":
        limitations.append(UNVERIFIED)
    if results.get("ecology", {}).get("status") == "not_estimable":
        limitations.append(ECOLOGY_LIMITATION)
    return ExplanationOutput(summary=SUMMARY, key_findings=findings,
                             limitations=limitations,
                             cited_metric_keys=[m["key"] for m in selected])


def validate_grounding(candidate, approved):
    """Reject new/misattributed numbers, unknown metric keys and lost caveats."""
    output = ExplanationOutput.model_validate(candidate)
    if (output.summary != approved.summary
            or len(set(output.key_findings)) != len(output.key_findings)
            or set(output.key_findings) != set(approved.key_findings)
            or set(output.limitations) != set(approved.limitations)
            or len(output.limitations) != len(approved.limitations)
            or set(output.cited_metric_keys) != set(approved.cited_metric_keys)
            or len(output.cited_metric_keys) != len(approved.cited_metric_keys)):
        raise ValueError("Provider output does not match approved clauses.")
    return output


def provider_schema(value):
    """Copy a JSON schema, removing unsupported keys at every nesting level.

    Only the provider's schema is relaxed; strict Pydantic and clause validation
    still reject unknown fields locally before any explanation is persisted.
    """
    if isinstance(value, dict):
        return {key: provider_schema(item) for key, item in value.items() if key != "additionalProperties"}
    if isinstance(value, list):
        return [provider_schema(item) for item in value]
    return value


def _provider_output(approved, api_key, model_id):
    from google import genai
    from google.genai import types

    # A bounded optional request; numerical outputs have already been committed.
    with genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=15000)) as client:
        response = client.models.generate_content(
            model=model_id,
            contents=("Select and order these approved explanation clauses. Copy every clause exactly; "
                      "do not add or omit facts, numbers, citations or limitations. Return only the schema.\n"
                      + json.dumps(approved.model_dump(), ensure_ascii=False)),
            config=types.GenerateContentConfig(temperature=0,
                                               response_mime_type="application/json",
                                               response_schema=provider_schema(ExplanationOutput.model_json_schema())),
        )
        return json.loads(response.text)


def generate_explanation(results, focus: Focus = "general", *, api_key=None, model_id=None):
    approved = approved_output(results, focus)
    key = settings.GEMINI_API_KEY if api_key is None else api_key
    model = settings.GEMINI_MODEL if model_id is None else model_id
    output, source, reason = approved, "deterministic_fallback", "missing_api_key"
    if key.strip():
        try:
            candidate = _provider_output(approved, key, model)
        except Exception:
            # Do not expose provider exceptions, credentials or request contents.
            reason = "provider_unavailable"
        else:
            try:
                output = validate_grounding(candidate, approved)
                source, reason = "gemini", None
            except (ValueError, TypeError):
                reason = "grounding_rejected"
    evidence = output.model_dump() | {
        "metrics": deepcopy(results["metrics"]), "source": source,
        "model_id": model, "prompt_version": PROMPT_VERSION, "fallback_reason": reason,
    }
    narrative = "\n\n".join([output.summary, *output.key_findings, *output.limitations])
    return {"narrative": narrative, "key_drivers": output.key_findings, "grounded_evidence": evidence}
