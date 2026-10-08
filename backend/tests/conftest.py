"""Pytest fixtures for Pax Virentia test suite."""

import sys
from pathlib import Path
import pytest

# Ensure backend/app is importable
app_path = Path(__file__).resolve().parent.parent / "app"
if str(app_path) not in sys.path:
    sys.path.insert(0, str(app_path))
