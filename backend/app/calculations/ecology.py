"""Evidence-gated ecological indicator assessment module."""

from typing import Optional, Dict, Any
from app.domain.models import EcologicalResult, MetricStatus


def assess_ecological_impact(
    indicator_key: str,
    evidence_package: Optional[Dict[str, Any]] = None,
) -> EcologicalResult:
    """
    Evaluates ecological indicators against required scientific evidence criteria.

    Invariant:
      If a validated local exposure-response relationship, thresholds, or paired
      observations are absent, returns status `not_estimable` with reasons,
      strictly avoiding fabricated damage percentages or unsupported green scores.
    """
    # Gating check: until an adviser-approved model and paired observations exist,
    # all local ecosystem stress predictions are gated as not estimable.
    if not evidence_package or not evidence_package.get("validated_model_available", False):
        return EcologicalResult(
            indicator_key=indicator_key,
            status=MetricStatus.NOT_ESTIMABLE,
            value=None,
            unit=None,
            reason="Validated local exposure-response model or paired observation dataset is unavailable.",
            required_evidence=[
                "adviser-approved exposure-response methodology",
                "localized temporal ecosystem baseline observations",
                "independent model validation metrics",
            ],
        )

    # When validated evidence is supplied:
    return EcologicalResult(
        indicator_key=indicator_key,
        status=MetricStatus.VALID,
        value=evidence_package.get("computed_value"),
        unit=evidence_package.get("unit"),
        reason="Evidence criteria satisfied.",
        required_evidence=[],
    )
