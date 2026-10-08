"""Unit tests for pure calculation modules in Pax Virentia."""

import unittest
from app.calculations.energy import calculate_energy
from app.calculations.carbon import calculate_emissions
from app.calculations.economics import calculate_economics
from app.calculations.ecology import assess_ecological_impact
from app.domain.models import EquipmentDuty, MetricStatus
from app.domain.exceptions import (
    InvalidOperatingParameterError,
    MissingEmissionFactorError,
)


class TestCalculations(unittest.TestCase):

    def test_illustrative_arithmetic_fixture_from_design_spec(self):
        """
        Verifies Section 6 illustrative fixture:
        100 kWh, 0.5 kg CO2e/kWh, PHP 10/kWh tariff -> 50 kg CO2e & PHP 1,000 electricity cost.
        """
        energy_kwh = 100.0
        grid_factor = 0.5
        tariff = 10.0

        carbon_res = calculate_emissions(energy_kwh=energy_kwh, factor_kg_per_kwh=grid_factor)
        econ_res = calculate_economics(
            energy_kwh=energy_kwh,
            tariff_php_per_kwh=tariff,
            treated_volume_m3=50.0,
        )

        self.assertEqual(carbon_res.emissions_kg_co2e, 50.0)
        self.assertEqual(econ_res.electricity_cost_php, 1000.0)
        self.assertEqual(econ_res.total_opex_php, 1000.0)

    def test_energy_calculation_and_intensity(self):
        duties = [
            EquipmentDuty(equipment_id="pump-1", power_kw=5.0, load_multiplier=1.0, hours=10.0),
            EquipmentDuty(equipment_id="mixer-1", power_kw=2.5, load_multiplier=0.8, hours=10.0),
        ]
        # pump-1: 5 * 1.0 * 10 = 50 kWh; mixer-1: 2.5 * 0.8 * 10 = 20 kWh; total = 70 kWh
        result = calculate_energy(equipment_duties=duties, treated_volume_m3=35.0)

        self.assertEqual(result.total_kwh, 70.0)
        self.assertEqual(result.energy_intensity_kwh_per_m3, 2.0)
        self.assertEqual(result.status, MetricStatus.VALID)
        self.assertEqual(len(result.warnings), 0)

    def test_energy_zero_volume_handling(self):
        duties = [EquipmentDuty(equipment_id="pump-1", power_kw=10.0, hours=5.0)]
        result = calculate_energy(equipment_duties=duties, treated_volume_m3=0.0)

        self.assertEqual(result.total_kwh, 50.0)
        self.assertIsNone(result.energy_intensity_kwh_per_m3)
        self.assertTrue(any("zero" in w.lower() for w in result.warnings))

    def test_carbon_delta_calculation(self):
        baseline_emissions = 85.0
        result = calculate_emissions(
            energy_kwh=100.0,
            factor_kg_per_kwh=0.75,
            baseline_emissions_kg_co2e=baseline_emissions,
        )
        # 100 * 0.75 = 75 kg CO2e; delta = 75 - 85 = -10 kg CO2e
        self.assertEqual(result.emissions_kg_co2e, 75.0)
        self.assertEqual(result.delta_kg_co2e, -10.0)

    def test_carbon_invalid_factor(self):
        with self.assertRaises(MissingEmissionFactorError):
            calculate_emissions(energy_kwh=100.0, factor_kg_per_kwh=0.0)

    def test_economic_chemical_mass_and_savings(self):
        # Treated volume 1000 m3, dose 2.5 mg/L -> chemical kg = 2.5 kg
        # Chem price: 60 PHP/kg -> chem cost = 150 PHP
        # Energy: 200 kWh at 10 PHP/kWh -> elec cost = 2000 PHP
        # Total OPEX = 2150 PHP
        # Baseline OPEX: 2500 PHP -> net savings = 350 PHP
        # Capex: 700 PHP -> payback = 2.0 years
        result = calculate_economics(
            energy_kwh=200.0,
            tariff_php_per_kwh=10.0,
            treated_volume_m3=1000.0,
            dose_mg_per_l=2.5,
            chemical_price_php_per_kg=60.0,
            baseline_opex_php=2500.0,
            incremental_capex_php=700.0,
        )

        self.assertEqual(result.chemical_kg_used, 2.5)
        self.assertEqual(result.chemical_cost_php, 150.0)
        self.assertEqual(result.electricity_cost_php, 2000.0)
        self.assertEqual(result.total_opex_php, 2150.0)
        self.assertEqual(result.net_savings_php, 350.0)
        self.assertEqual(result.simple_payback_years, 2.0)

    def test_ecological_assessment_gate(self):
        # Gate check: default returns not_estimable without validated model
        result = assess_ecological_impact(indicator_key="downstream_stress")

        self.assertEqual(result.status, MetricStatus.NOT_ESTIMABLE)
        self.assertIsNone(result.value)
        self.assertIn("unavailable", result.reason.lower())
        self.assertGreater(len(result.required_evidence), 0)


if __name__ == "__main__":
    unittest.main()
