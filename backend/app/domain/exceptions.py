"""Pax Virentia domain exceptions."""

class PaxVirentiaError(Exception):
    """Base exception for Pax Virentia domain errors."""


class InvalidOperatingParameterError(PaxVirentiaError):
    """Raised when operating parameters (flow rate, duty hours, load factor) violate physical limits."""


class ZeroVolumeError(InvalidOperatingParameterError):
    """Raised when volume is zero or negative where positive service volume is required."""


class MissingEmissionFactorError(PaxVirentiaError):
    """Raised when no valid, compatible grid emission factor is available."""


class IncompatibleScenarioComparisonError(PaxVirentiaError):
    """Raised when comparing scenarios with mismatched service volume, period, currency, or boundaries."""
