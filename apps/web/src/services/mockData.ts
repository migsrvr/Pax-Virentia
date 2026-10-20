import type {
  DatasetVersion,
  GridFactor,
  MetricDelta,
  PlantObservation,
  ScenarioRevision,
  SimulationRun,
} from '../types';

export const WORKSPACE = {
  name: 'Pax Virentia Research Workspace',
  plant: 'Representative Plant — Luzon-Visayas Grid',
  context: 'Representative plant · Offline scenario analysis',
  descriptor: 'Water-treatment scenario analysis',
  tagline: 'Compare scenarios. Understand the tradeoffs.',
  timezone: 'Asia/Manila',
};

export const CURRENT_USER = {
  name: 'Analyst',
  email: 'analyst@paxvirentia.local',
  role: 'Analyst' as const,
};

export const GRID_FACTORS: GridFactor[] = [
  {
    factor_id: 'ph-luzon-visayas-2023',
    grid_region: 'Luzon-Visayas',
    reporting_year: 2023,
    gas_basis: 'CO2e',
    accounting_method: 'Operating Margin / Grid Average',
    kg_co2e_per_kwh: 0.7122,
    reference: 'DOE National Grid Emission Factor Report',
  },
  {
    factor_id: 'ph-mindanao-2023',
    grid_region: 'Mindanao',
    reporting_year: 2023,
    gas_basis: 'CO2e',
    accounting_method: 'Operating Margin / Grid Average',
    kg_co2e_per_kwh: 0.548,
    reference: 'DOE National Grid Emission Factor Report',
  },
  {
    factor_id: 'ph-national-iea-2023',
    grid_region: 'Philippines National',
    reporting_year: 2023,
    gas_basis: 'CO2e',
    accounting_method: 'IEA Generation Mix',
    kg_co2e_per_kwh: 0.685,
    reference: 'IEA Emission Factors 2023',
  },
];

export const PLANT_OBSERVATIONS: PlantObservation[] = [
  {
    period_start: '2026-01-01T00:00:00+08:00',
    period_end: '2026-01-01T23:59:59+08:00',
    volume_m3: 12000,
    electricity_kwh: 4800,
    pump_hours: 24,
    mixing_hours: 18,
    chemical_dose_mg_per_l: 3.2,
    water_turbidity_ntu: 4.5,
    ph_level: 7.2,
    notes: 'Baseline steady operation',
  },
  {
    period_start: '2026-01-02T00:00:00+08:00',
    period_end: '2026-01-02T23:59:59+08:00',
    volume_m3: 12500,
    electricity_kwh: 5000,
    pump_hours: 24,
    mixing_hours: 20,
    chemical_dose_mg_per_l: 3.4,
    water_turbidity_ntu: 5.1,
    ph_level: 7.1,
    notes: 'Baseline steady operation',
  },
  {
    period_start: '2026-01-03T00:00:00+08:00',
    period_end: '2026-01-03T23:59:59+08:00',
    volume_m3: 11800,
    electricity_kwh: 4720,
    pump_hours: 23.5,
    mixing_hours: 17.5,
    chemical_dose_mg_per_l: 3.1,
    water_turbidity_ntu: 4.2,
    ph_level: 7.3,
    notes: 'Baseline steady operation',
  },
  {
    period_start: '2026-01-04T00:00:00+08:00',
    period_end: '2026-01-04T23:59:59+08:00',
    volume_m3: 13100,
    electricity_kwh: 5240,
    pump_hours: 24,
    mixing_hours: 21,
    chemical_dose_mg_per_l: 3.5,
    water_turbidity_ntu: 5.8,
    ph_level: 7.0,
    notes: 'High turbidity event',
  },
  {
    period_start: '2026-01-05T00:00:00+08:00',
    period_end: '2026-01-05T23:59:59+08:00',
    volume_m3: 12200,
    electricity_kwh: 4880,
    pump_hours: 24,
    mixing_hours: 18.5,
    chemical_dose_mg_per_l: 3.3,
    water_turbidity_ntu: 4.6,
    ph_level: 7.2,
    notes: 'Baseline steady operation',
  },
];

export const DATASETS: DatasetVersion[] = [
  {
    id: 'ds-plant-jan26',
    name: 'Plant observations — Jan 2026',
    version: 'v1.2',
    rows: 5,
    content_hash: 'sha256:9f2c…a41b',
    quality_score: 94,
    source: 'Plant logbook CSV · measured',
    period: '01–05 Jan 2026 · Asia/Manila',
    status: 'validated',
    issues: [
      { level: 'warning', field: 'water_turbidity_ntu', message: 'High turbidity on 04 Jan flagged but retained with analyst note.', rows_affected: 1 },
      { level: 'info', field: 'ph_level', message: 'All pH values within 7.0–7.3 operating band.', rows_affected: 0 },
    ],
  },
  {
    id: 'ds-plant-dec25',
    name: 'Plant observations — Dec 2025',
    version: 'v1.0',
    rows: 31,
    content_hash: 'sha256:77de…02c9',
    quality_score: 81,
    source: 'Plant logbook CSV · measured + assumed tariff',
    period: '01–31 Dec 2025 · Asia/Manila',
    status: 'needs_review',
    issues: [
      { level: 'error', field: 'electricity_kwh', message: '2 rows missing energy; imputation blocked — analyst must resolve.', rows_affected: 2 },
      { level: 'warning', field: 'chemical_dose_mg_per_l', message: '1 outlier retained with detection rule noted.', rows_affected: 1 },
    ],
  },
];

export const SCENARIOS: ScenarioRevision[] = [
  {
    id: 'scn-baseline-r3',
    name: 'Baseline — Conventional operation',
    revision_no: 3,
    kind: 'baseline',
    updated_at: '2026-10-07 14:20 PHT',
    volume_m3: 61600,
    period: '01–05 Jan 2026',
    tariff_php_per_kwh: 10.45,
    technology: 'Conventional spec v1.1 (verified)',
    factor_id: 'ph-luzon-visayas-2023',
  },
  {
    id: 'scn-paxsilica-r2',
    name: 'Pax Silica — Intervention draft',
    revision_no: 2,
    kind: 'intervention',
    updated_at: '2026-10-08 09:12 PHT',
    volume_m3: 61600,
    period: '01–05 Jan 2026',
    tariff_php_per_kwh: 10.45,
    technology: 'Pax Silica spec v0.4 (unverified — technical source pending)',
    factor_id: 'ph-luzon-visayas-2023',
  },
];

export const RUNS: SimulationRun[] = [
  {
    id: 'run-baseline-r3',
    scenario_name: 'Baseline — Conventional operation',
    revision_no: 3,
    kind: 'baseline',
    status: 'succeeded',
    started_at: '2026-10-07 14:22 PHT',
    ended_at: '2026-10-07 14:22:41 PHT',
    energy_kwh: 24640,
    emissions_kgco2e: 17548.6,
    opex_php: 312458,
    ecology_status: 'not_estimable',
  },
  {
    id: 'run-paxsilica-r2',
    scenario_name: 'Pax Silica — Intervention draft',
    revision_no: 2,
    kind: 'intervention',
    status: 'succeeded',
    started_at: '2026-10-08 09:14 PHT',
    ended_at: '2026-10-08 09:14:38 PHT',
    energy_kwh: 22176,
    emissions_kgco2e: 15793.7,
    opex_php: 289120,
    ecology_status: 'not_estimable',
  },
  {
    id: 'run-paxsilica-r3',
    scenario_name: 'Pax Silica — Sensitivity +mixing',
    revision_no: 3,
    kind: 'intervention',
    status: 'running',
    started_at: '2026-10-09 01:58 PHT',
    energy_kwh: null,
    emissions_kgco2e: null,
    opex_php: null,
    ecology_status: 'pending',
  },
];

export const COMPARISON_DELTAS: MetricDelta[] = [
  {
    key: 'energy',
    label: 'Electricity demand',
    unit: 'kWh / period',
    baseline: 24640,
    intervention: 22176,
    delta: -2464,
    delta_pct: -10.0,
    baseline_status: 'valid',
    intervention_status: 'valid',
  },
  {
    key: 'emissions',
    label: 'Electricity-associated emissions',
    unit: 'kgCO₂e / period',
    baseline: 17548.6,
    intervention: 15793.7,
    delta: -1754.9,
    delta_pct: -10.0,
    baseline_status: 'valid',
    intervention_status: 'valid',
  },
  {
    key: 'opex',
    label: 'Period operating cost',
    unit: 'PHP / period',
    baseline: 312458,
    intervention: 289120,
    delta: -23338,
    delta_pct: -7.47,
    baseline_status: 'valid',
    intervention_status: 'valid',
  },
  {
    key: 'ecology',
    label: 'Ecological indicator',
    unit: '—',
    baseline: null,
    intervention: null,
    delta: null,
    delta_pct: null,
    baseline_status: 'not_estimable',
    intervention_status: 'not_estimable',
  },
];

/** Latest published snapshot shown on the public portal landing page (Figma P01 · Landing). */
export const PUBLIC_LATEST_SNAPSHOT = {
  id: 'PS-004',
  publishedLabel: 'published 13 Oct 2026 after internal review',
  comparisonLabel: 'Pax Silica pilot vs current operation · 1–5 Jan 2026',
  metrics: [
    {
      key: 'electricity',
      label: 'Electricity used',
      value: '23,049 kWh',
      detail: 'to treat 61,600 m³',
      deltaLabel: '6.5% less',
    },
    {
      key: 'electricity-co2e',
      label: 'CO₂e from electricity',
      value: '16,415 kg',
      detail: 'Luzon–Visayas grid',
      deltaLabel: '6.5% less',
    },
    {
      key: 'opex',
      label: 'Operating cost',
      value: '₱329,163',
      detail: '₱5.34 per m³',
      deltaLabel: '3.8% less',
    },
    {
      key: 'ecology',
      label: 'Downstream ecosystem stress',
      value: 'Not estimable',
      detail: 'Not enough local data yet',
      deltaLabel: null,
    },
  ],
};

/** Public portal dashboard (Figma P02 · Public dashboard) — the three published
 *  scenarios of snapshot PS-004. Card values, deltas and bar data mirror the
 *  frame; alternate-scenario detail lines are derived from those same numbers. */
interface PublishedScenario {
  id: 'pax-silica' | 'reduced-mixing' | 'current-operation';
  label: string;
  showingTitle: string;
  showingDetail: string;
  /** True for Current operation — deltas render as a muted baseline pill. */
  baseline: boolean;
  electricity: number;
  co2e: number;
  cost: number;
  electricityDelta: { pct: string | null; abs: string };
  co2eDelta: { pct: string | null; abs: string };
  costDelta: { pct: string | null; abs: string };
  electricityNote: string;
  co2eNote: string;
  costNote: string;
  /** Fixed pump load for the 61,600 m³ / 5-day volume (mixers are the remainder). */
  pumpsKwh: number;
}

export const PUBLIC_DASHBOARD: {
  scenarios: PublishedScenario[];
  comparison: { heading: string; values: Record<PublishedScenario['id'], number> }[];
  meaning: string[];
  limits: string[];
} = {
  scenarios: [
    {
      id: 'pax-silica',
      label: 'Pax Silica pilot',
      showingTitle: 'Showing: Pax Silica pilot',
      showingDetail:
        'A prospective treatment step with lower mixing power and less coagulant. Its specification hasn’t been verified yet.',
      baseline: false,
      electricity: 23049,
      co2e: 16415,
      cost: 329163,
      electricityDelta: { pct: '6.5% less', abs: '−1,596 kWh vs current operation' },
      co2eDelta: { pct: '6.5% less', abs: '−1,137 kg vs current operation' },
      costDelta: { pct: '3.8% less', abs: '−₱13,096 vs current operation' },
      electricityNote: 'About 0.37 kWh to treat each cubic metre (1,000 litres) of water.',
      co2eNote: 'Based on the Luzon–Visayas grid’s emissions per kWh.',
      costNote: 'About ₱5.34 per cubic metre for this 5-day period.',
      pumpsKwh: 19800,
    },
    {
      id: 'reduced-mixing',
      label: 'Reduced mixing',
      showingTitle: 'Showing: Reduced mixing',
      showingDetail:
        'A gentler agitation profile that trims mixer power. Its specification hasn’t been verified yet.',
      baseline: false,
      electricity: 23676,
      co2e: 16862,
      cost: 331600,
      electricityDelta: { pct: '3.9% less', abs: '−969 kWh vs current operation' },
      co2eDelta: { pct: '3.9% less', abs: '−690 kg vs current operation' },
      costDelta: { pct: '3.1% less', abs: '−₱10,659 vs current operation' },
      electricityNote: 'About 0.38 kWh to treat each cubic metre (1,000 litres) of water.',
      co2eNote: 'Based on the Luzon–Visayas grid’s emissions per kWh.',
      costNote: 'About ₱5.38 per cubic metre for this 5-day period.',
      pumpsKwh: 19800,
    },
    {
      id: 'current-operation',
      label: 'Current operation',
      showingTitle: 'Showing: Current operation',
      showingDetail: 'How the plant operates today. Other scenarios are compared against this baseline.',
      baseline: true,
      electricity: 24645,
      co2e: 17552,
      cost: 342259,
      electricityDelta: { pct: null, abs: 'Baseline for this snapshot' },
      co2eDelta: { pct: null, abs: 'Baseline for this snapshot' },
      costDelta: { pct: null, abs: 'Baseline for this snapshot' },
      electricityNote: 'About 0.40 kWh to treat each cubic metre (1,000 litres) of water.',
      co2eNote: 'Based on the Luzon–Visayas grid’s emissions per kWh.',
      costNote: 'About ₱5.56 per cubic metre for this 5-day period.',
      pumpsKwh: 19800,
    },
  ],
  comparison: [
    { heading: 'Electricity (kWh)', values: { 'current-operation': 24645, 'pax-silica': 23049, 'reduced-mixing': 23676 } },
    { heading: 'CO₂e (kg)', values: { 'current-operation': 17552, 'pax-silica': 16415, 'reduced-mixing': 16862 } },
    { heading: 'Operating cost (₱)', values: { 'current-operation': 342259, 'pax-silica': 329163, 'reduced-mixing': 331600 } },
  ],
  meaning: [
    'Treating water takes electricity — mostly for pumping. Less electricity usually means lower costs and fewer emissions.',
    'CO₂e counts only the emissions from generating that electricity on the Luzon–Visayas grid.',
    '“Less” and “more” compare each scenario with how the plant operates today, over the same 5 days and water volume.',
  ],
  limits: [
    'One representative plant and sample data — not every facility in the district.',
    'The Pax Silica specification hasn’t been independently verified.',
    'Effects on rivers and coastal ecosystems can’t be estimated yet.',
  ],
};

/** P03 · Environmental impacts (Figma 43:2). Static explainer page — no scenario toggle.
 *  Copy is verbatim from the frame; apostrophes are straight there, double quotes curly. */
export const PUBLIC_IMPACTS = {
  intro:
    'What the model estimates for the representative plant, how it does it, and what it leaves out. Figures are simulated estimates for 1–5 Jan 2026 from published snapshot PS-004.',
  topics: [
    { label: 'Energy use', anchor: 'energy-use', icon: 'bolt' },
    { label: 'Emissions', anchor: 'emissions', icon: 'cloud' },
    { label: 'Costs', anchor: 'costs', icon: 'coins' },
    { label: 'Ecosystem', anchor: 'ecosystem', icon: 'sprout' },
  ],
  cta: {
    text: 'Next: see how the published scenarios compare, side by side.',
    button: 'Compare published scenarios',
  },
  energy: {
    heading: 'Energy use',
    intro:
      'Treating water takes electricity. In this model, pumps move water through the plant, and mixers help treatment chemicals bind small particles so they settle out.',
    how: 'For each piece of equipment: power × hours it runs (× how hard mixers run).',
    notIncluded: [
      'Lighting and offices',
      'Sedimentation, filtration and disinfection equipment — no energy data yet',
    ],
    callout: { title: '61,600 m³ of water treated in 5 days', detail: 'About 12,320 m³ a day · sample data' },
    cardTitle: 'Electricity by scenario',
    cardSubtitle: 'kWh over 5 days · bars start at zero',
    legend: ['Pumps', 'Mixers'],
    pumpsKwh: 19800,
    rows: [
      { id: 'current-operation', label: 'Current operation', total: 24645, mixersKwh: 4845 },
      { id: 'pax-silica', label: 'Pax Silica pilot', total: 23049, mixersKwh: 3249 },
      { id: 'reduced-mixing', label: 'Reduced mixing', total: 23676, mixersKwh: 3876 },
    ],
    footnote:
      'Pumping is the same in every scenario (19,800 kWh). The differences come from how much the mixers run.',
  },
  emissions: {
    heading: 'Emissions',
    intro:
      'CO₂e (carbon dioxide equivalent) adds up greenhouse gases as if they were all carbon dioxide, so they can be compared on one scale.',
    how: `Electricity used × the grid's emissions for each kWh: 0.7122 kg CO₂e on the Luzon–Visayas grid. That's a 2023 published value, assumed for 2026 until a newer one is available.`,
    notIncluded: [
      'Making and transporting treatment chemicals',
      'Emissions released directly by treatment processes',
      'Building the plant and its equipment',
    ],
    cardTitle: 'CO₂e by scenario',
    cardSubtitle: 'kg CO₂e over 5 days · from electricity only',
    rows: [
      { id: 'current-operation', label: 'Current operation', total: 17552 },
      { id: 'pax-silica', label: 'Pax Silica pilot', total: 16415 },
      { id: 'reduced-mixing', label: 'Reduced mixing', total: 16862 },
    ],
    formula: {
      electricityLabel: 'Electricity',
      electricity: '23,049 kWh',
      factorLabel: 'Grid factor',
      factor: '0.7122 kg/kWh',
      resultLabel: 'Pax Silica pilot',
      result: '16,415 kg CO₂e',
    },
  },
  costs: {
    heading: 'Costs',
    intro: `Operating cost covers electricity, coagulant, labor, maintenance and other running costs for the 5 days. Buying or building equipment is a separate capital cost and isn't included here.`,
    how: 'Electricity × ₱11.00 per kWh, plus coagulant × ₱50 per kg, plus fixed labor, maintenance and other costs. All prices are assumptions for this sample.',
    cardTitle: 'Operating cost by scenario',
    cardSubtitle: '₱ over 5 days · bars start at zero',
    legend: ['Electricity', 'Coagulant, labor, maintenance and other'],
    rows: [
      { id: 'current-operation', label: 'Current operation', total: 342259, electricity: 271095 },
      { id: 'pax-silica', label: 'Pax Silica pilot', total: 329163, electricity: 253539 },
      { id: 'reduced-mixing', label: 'Reduced mixing', total: 331600, electricity: 260436 },
    ],
    footnote:
      'Per cubic metre: ₱5.56 today, ₱5.34 with the Pax Silica pilot and ₱5.38 with reduced mixing. Electricity is about four-fifths of the total in every scenario.',
  },
  ecosystem: {
    heading: 'Ecosystem indicators',
    introLead: 'The indicator here is ',
    introBold: 'downstream ecosystem stress',
    introTail: `: how the plant's operation might affect rivers and coastal waters below its discharge.`,
    whyHeading: "Why there's no value yet",
    why: `There's no validated local model and not enough paired river and coastal observations. “Not estimable” means unknown — not zero, and not safe.`,
    whatHeading: 'What would make it estimable',
    what: [
      'A defined target, such as dissolved oxygen downstream',
      'Observations of plant operations and that target, side by side',
      'An independently checked model',
    ],
    cardTitle: 'Downstream ecosystem stress',
    cardSubtitle: 'Published snapshot PS-004 · all scenarios',
    chip: 'Not estimable',
    callout: "No value is shown because the evidence isn't there yet.",
    scaleChip: 'Illustrative scale — not a model output',
    scaleCaption: 'How a future value would be read',
    scale: [
      { tone: 'positive', title: 'Low stress', desc: 'Conditions stay within the target range' },
      { tone: 'warning', title: 'Moderate stress', desc: 'Conditions sometimes leave the target range' },
      { tone: 'critical', title: 'High stress', desc: 'Conditions often leave the target range' },
    ],
  },
} as const;

/** P04 · Compare published scenarios (Figma 44:2). Scenario cards + diverging
 *  percent-change chart + benefits table. Copy verbatim from the frame. */
export const PUBLIC_SCENARIO_COMPARISON = {
  heading: 'Compare published scenarios',
  intro:
    'Three ways the representative plant could run, modeled over the same 5 days (1–5 Jan 2026) and the same 61,600 m³ of water, with the same prices and grid — so the differences are like for like.',
  chips: [
    { label: 'Simulated estimates', tone: 'info' },
    { label: 'Sample data', tone: 'muted' },
    { label: 'Snapshot PS-004 · 13 Oct 2026', tone: 'highlight' },
  ],
  cards: [
    {
      id: 'current-operation',
      label: 'Current operation',
      description: 'How the plant runs today. The other scenarios are compared with this one.',
      metrics: [
        { label: 'Electricity', value: '24,645 kWh', sub: '0.40 kWh per m³', aside: { text: 'Reference', positive: false } },
        { label: 'CO₂e', value: '17,552 kg', sub: 'From electricity', aside: { text: 'Reference', positive: false } },
        { label: 'Operating cost', value: '₱342,259', sub: '₱5.56 per m³', aside: { text: 'Reference', positive: false } },
        { label: 'Ecosystem stress', value: 'Not estimable' },
      ],
      note: null,
    },
    {
      id: 'pax-silica',
      label: 'Pax Silica pilot',
      description: 'A prospective treatment step with lower mixing power and less coagulant.',
      metrics: [
        { label: 'Electricity', value: '23,049 kWh', sub: '0.37 kWh per m³', aside: { text: '6.5% less', positive: true } },
        { label: 'CO₂e', value: '16,415 kg', sub: 'From electricity', aside: { text: '6.5% less', positive: true } },
        { label: 'Operating cost', value: '₱329,163', sub: '₱5.34 per m³', aside: { text: '3.8% less', positive: true } },
        { label: 'Ecosystem stress', value: 'Not estimable' },
      ],
      note: "Its specification hasn't been verified, and it would need about ₱1.8 million of new investment (assumed).",
    },
    {
      id: 'reduced-mixing',
      label: 'Reduced mixing',
      description: "Today's equipment, with mixers run at 80% of their power.",
      metrics: [
        { label: 'Electricity', value: '23,676 kWh', sub: '0.38 kWh per m³', aside: { text: '3.9% less', positive: true } },
        { label: 'CO₂e', value: '16,862 kg', sub: 'From electricity', aside: { text: '3.9% less', positive: true } },
        { label: 'Operating cost', value: '₱331,600', sub: '₱5.38 per m³', aside: { text: '3.1% less', positive: true } },
        { label: 'Ecosystem stress', value: 'Not estimable' },
      ],
      note: "No new equipment needed, but water quality with gentler mixing hasn't been checked.",
    },
  ],
  change: {
    title: 'Change compared with current operation',
    subtitle: 'Percent change · bars to the left mean less than today',
    rows: [
      {
        label: 'Electricity',
        bars: [
          { id: 'pax-silica', pct: 6.5, text: '−6.5%' },
          { id: 'reduced-mixing', pct: 3.9, text: '−3.9%' },
        ],
      },
      {
        label: 'CO₂e',
        bars: [
          { id: 'pax-silica', pct: 6.5, text: '−6.5%' },
          { id: 'reduced-mixing', pct: 3.9, text: '−3.9%' },
        ],
      },
      {
        label: 'Operating cost',
        bars: [
          { id: 'pax-silica', pct: 3.8, text: '−3.8%' },
          { id: 'reduced-mixing', pct: 3.1, text: '−3.1%' },
        ],
      },
    ],
    /** Axis labels; the scale runs −10% … 0 … +10% across the two 365px columns. */
    negativeTicks: ['−10%', '−5%', '0'],
    positiveTicks: ['+5%', '+10%'],
  },
  table: {
    title: 'Benefits and trade-offs',
    headers: ['Scenario', 'Benefits', 'Trade-offs and unknowns'],
    rows: [
      {
        label: 'Pax Silica pilot',
        benefit: 'The largest modeled cuts: 1,596 kWh less electricity and ₱13,096 lower running costs over 5 days.',
        tradeoff: 'Needs new investment, adds a material cost, and depends on an unverified specification.',
      },
      {
        label: 'Reduced mixing',
        benefit: "Saves 969 kWh and ₱10,659 over 5 days using today's equipment.",
        tradeoff: "Gentler mixing could change how well particles settle. Water quality isn't part of the model.",
      },
      {
        label: 'Both',
        benefit: 'Lower electricity also means fewer emissions from the grid.',
        tradeoff: "Effects on downstream rivers and coasts can't be estimated yet.",
      },
    ],
  },
  cta: {
    text: 'Next: general recommendations drawn from these results.',
    button: 'Read recommendations',
  },
} as const;

/** P05 · Public recommendations (Figma 46:2). Six recommendation cards, each
 *  with a benefit box (positive or neutral) and a pinned meta footer, plus an
 *  intro callout. Copy verbatim from the frame. */
export const PUBLIC_RECOMMENDATIONS = {
  heading: 'Sustainability recommendations',
  intro:
    'General guidance drawn from the published simulations. Benefits are model-based estimates for the sample plant, not guarantees — real results depend on each plant.',
  chips: [
    { label: 'Benefits are simulated estimates', tone: 'info' },
    { label: 'Sample data', tone: 'muted' },
  ],
  callout:
    'These are ideas for water utilities, not instructions. Changes at a treatment plant should be decided by qualified operators after checking water quality and safety.',
  cards: [
    {
      id: 'mixers',
      chip: { label: 'Energy', tone: 'highlight' },
      title: 'Run mixers only as hard as treatment needs',
      description:
        'Mixers help chemicals catch particles. Running them gentler, where water quality allows, uses less electricity.',
      benefit: {
        label: 'Modeled benefit for the sample plant · 5 days',
        value: '969 kWh less electricity (3.9%) and 690 kg less CO₂e',
        tone: 'positive',
      },
      note: 'Water quality must be checked before mixing changes.',
      meta: ['Who acts: plant operators', 'Scenario: reduced mixing'],
    },
    {
      id: 'dosing',
      chip: { label: 'Cost', tone: 'highlight' },
      title: 'Fine-tune chemical dosing with lab tests',
      description: 'Using only as much coagulant as the water needs saves money and chemical deliveries.',
      benefit: {
        label: 'Modeled benefit for the sample plant · 5 days',
        value: '₱924 less spent on coagulant (3.3 → 3.0 mg/L)',
        tone: 'positive',
      },
      note: "The model doesn't include water quality, so lab checks come first.",
      meta: ['Who acts: plant operators and lab staff'],
    },
    {
      id: 'pumping',
      chip: { label: 'Energy', tone: 'highlight' },
      title: 'Match pumping hours to the water needed',
      description: "Pumping is the biggest electricity use. Trimming hours that aren't needed saves energy.",
      benefit: {
        label: 'Modeled benefit for the sample plant · 5 days',
        value: '165 kWh less electricity by trimming one pumping hour',
        tone: 'positive',
      },
      note: 'Reservoir levels and peak demand must stay covered.',
      meta: ['Who acts: plant operators'],
    },
    {
      id: 'new-technology',
      chip: { label: 'New technology', tone: 'analytics' },
      title: 'Test new treatment options carefully',
      description:
        "The Pax Silica pilot shows the largest modeled savings, but its technical specification hasn't been verified yet.",
      benefit: {
        label: 'Modeled benefit for the sample plant · 5 days',
        value: '6.5% less electricity and ₱13,096 lower running costs',
        tone: 'positive',
      },
      note: 'Needs verification and about ₱1.8 million of investment (assumed).',
      meta: ['Who acts: utility managers and researchers'],
    },
    {
      id: 'evidence',
      chip: { label: 'Evidence', tone: 'info' },
      title: 'Measure what matters downstream',
      description:
        'Collecting river and coastal data next to plant records would let ecosystem effects be estimated.',
      descMaxPx: 330,
      benefit: {
        label: 'Benefit',
        value: 'Makes the ecosystem indicator estimable · no modeled saving',
        tone: 'muted',
      },
      note: 'Needs a defined target, paired observations and an independent check.',
      meta: ['Who acts: researchers and regulators'],
    },
    {
      id: 'transparency',
      chip: { label: 'Transparency', tone: 'info' },
      title: 'Publish assumptions with results',
      description: 'Showing the inputs behind every number helps people judge how far to trust it.',
      benefit: {
        label: 'Benefit',
        value: 'Easier public review · no modeled saving',
        tone: 'muted',
      },
      note: 'Every figure on this portal links to its assumptions.',
      meta: ['Who acts: utility managers'],
    },
  ],
  cta: {
    text: 'Want the details behind these numbers?',
    button: 'Reports and methodology',
  },
} as const;

/** P06 · Reports and methodology (Figma 48:2). Published report rows, model
 *  methodology table, assumption table with provenance chips, and a glossary.
 *  Copy verbatim from the frame. */
export const PUBLIC_REPORTS = {
  heading: 'Reports and methodology',
  intro:
    'Download published reports, and see exactly how every number was estimated and which assumptions it rests on.',
  sections: [
    { label: 'Published reports', anchor: 'published-reports' },
    { label: 'Methodology', anchor: 'methodology' },
    { label: 'Assumptions', anchor: 'assumptions' },
    { label: 'Glossary', anchor: 'glossary' },
  ],
  reports: {
    heading: 'Published reports',
    sub: 'From snapshot PS-004 · reviewed internally · not a regulatory approval',
    rows: [
      {
        fileType: 'PDF',
        fileTone: 'critical',
        title: 'Scenario analysis — Jan 2026 sample period',
        meta: '6 pages · 1.2 MB · published 13 Oct 2026 · current operation, Pax Silica pilot and reduced mixing',
        status: 'Current',
        statusTone: 'positive',
        actions: [
          { label: 'View report', kind: 'outline', to: '/public/reports/scenario-analysis-jan-2026' },
          {
            label: 'Download PDF',
            kind: 'primary',
            icon: true,
            file: 'Scenario analysis — Jan 2026.pdf · 6 pages · 1.2 MB',
          },
        ],
      },
      {
        fileType: 'PDF',
        fileTone: 'critical',
        title: 'Methodology and assumptions',
        meta: '14 pages · 640 KB · published 13 Oct 2026',
        status: 'Current',
        statusTone: 'positive',
        actions: [
          { label: 'Read online', kind: 'outline' },
          { label: 'Download PDF', kind: 'outline', file: 'Methodology and assumptions.pdf · 14 pages · 640 KB' },
        ],
      },
      {
        fileType: 'CSV',
        fileTone: 'positive',
        title: 'Scenario data — Jan 2026',
        meta: 'Inputs and results for 3 scenarios · 18 KB · published 13 Oct 2026',
        status: 'Current',
        statusTone: 'positive',
        actions: [{ label: 'Download CSV', kind: 'outline' }],
      },
      {
        fileType: 'PDF',
        fileTone: 'muted',
        title: 'December 2025 snapshot (PS-003)',
        muted: true,
        meta: 'Withdrawn 12 Oct 2026',
        status: 'Withdrawn',
        statusTone: 'muted',
        actions: [
          {
            label: 'Why it was withdrawn',
            kind: 'ghost',
            to: '/public/reports/december-2025-snapshot-ps-003',
          },
        ],
      },
    ],
  },
  methodology: {
    heading: 'Methodology',
    sub: 'An offline model with no live connection to the plant. Each result is calculated from frozen inputs, so it can be reproduced.',
    columns: ['Indicator', 'In plain words', 'Formula'],
    rows: [
      {
        indicator: 'Energy use',
        plain: 'Each pump and mixer: its power × the hours it runs. Mixers are also scaled by how hard they run.',
        formula: 'kWh = Σ (kW × load × hours)',
      },
      {
        indicator: 'CO₂e emissions',
        plain: "Electricity used × the grid's emissions for each kWh.",
        formula: 'kg CO₂e = kWh × 0.7122',
      },
      {
        indicator: 'Coagulant use',
        plain: 'Dose × the amount of water treated.',
        formula: 'kg = mg/L × m³ ÷ 1,000',
      },
      {
        indicator: 'Operating cost',
        plain: 'Electricity and coagulant at assumed prices, plus fixed labor, maintenance and other running costs.',
        formula: '₱ = kWh × 11.00 + kg × 50 + fixed costs',
      },
      {
        indicator: 'Ecosystem stress',
        plain: 'Reported only when a validated local model and enough local data exist. Otherwise it\'s shown as “not estimable”.',
        formula: 'evidence check → not estimable',
      },
    ],
    footnote: 'Model versions: energy v1 · carbon v1 · cost v1 · ecology gate v1',
  },
  assumptions: {
    heading: 'Assumptions',
    sub: "Every input behind the published numbers, and how it's supported.",
    columns: ['Input', 'Value used', 'Type'],
    rows: [
      { input: 'Reporting period', value: '1–5 Jan 2026 (5 days)', chips: [{ label: 'Sample data', tone: 'highlight' }] },
      { input: 'Water treated', value: '61,600 m³', chips: [{ label: 'Sample data', tone: 'highlight' }] },
      { input: 'Pumping', value: '165 kW for 120 hours, every scenario', chips: [{ label: 'Assumed', tone: 'muted' }] },
      {
        input: 'Mixer power',
        value: '51 kW today · 38 kW with Pax Silica',
        chips: [
          { label: 'Assumed', tone: 'muted' },
          { label: 'Unverified (Pax Silica)', tone: 'warning' },
        ],
      },
      { input: 'Mixer load', value: '1.00 today · 0.90 Pax Silica · 0.80 reduced mixing', chips: [{ label: 'Scenario setting', tone: 'muted' }] },
      {
        input: 'Coagulant dose',
        value: '3.3 mg/L · 2.8 mg/L with Pax Silica',
        chips: [
          { label: 'Sample data', tone: 'highlight' },
          { label: 'Unverified (Pax Silica)', tone: 'warning' },
        ],
      },
      { input: 'Electricity price', value: '₱11.00 per kWh', chips: [{ label: 'Assumed', tone: 'muted' }] },
      { input: 'Coagulant price', value: '₱50 per kg', chips: [{ label: 'Assumed', tone: 'muted' }] },
      { input: 'Labor and maintenance', value: '₱55,000 for the period', chips: [{ label: 'Assumed', tone: 'muted' }] },
      { input: 'Other running costs', value: '₱6,000 · ₱12,000 with Pax Silica (includes material)', chips: [{ label: 'Assumed', tone: 'muted' }] },
      {
        input: 'Grid emissions factor',
        value: '0.7122 kg CO₂e per kWh — the DOE 2023 Luzon–Visayas value, used for 2026',
        chips: [{ label: 'Assumed', tone: 'muted' }],
      },
    ],
  },
  glossary: {
    heading: 'Glossary',
    items: [
      { term: 'Simulated estimate', definition: 'A number calculated by the model from inputs and assumptions — not a measurement.' },
      { term: 'Sample data', definition: 'Illustrative data used to demonstrate the platform, not records from a real plant.' },
      { term: 'Scenario', definition: 'One way the plant could operate, described by its settings and assumptions.' },
      { term: 'Current operation', definition: 'The baseline scenario: how the plant runs today. Others are compared with it.' },
      { term: 'CO₂e', definition: 'Carbon dioxide equivalent — greenhouse gases counted as if they were all CO₂.' },
      { term: 'Grid emissions factor', definition: 'How much CO₂e is released for each kWh of electricity on a given grid.' },
      { term: 'Not estimable', definition: "The evidence isn't there to give a value. It means unknown — not zero." },
      { term: 'Snapshot', definition: "A reviewed, published set of results. Later edits can't change it; it can only be withdrawn." },
    ],
  },
} as const;

/** P07 · Report detail (Figma 49:2). The scenario-analysis report opened from
 *  "Published reports": a two-page PDF preview on a grey canvas, an in-report
 *  table of contents, limitations and the citation. Copy verbatim from the
 *  frame. */
export const PUBLIC_REPORT_DETAIL = {
  breadcrumb: {
    parent: 'Reports and methodology',
    current: 'Scenario analysis — Jan 2026 sample period',
  },
  title: 'Scenario analysis — Jan 2026 sample period',
  meta: 'PDF · 6 pages · 1.2 MB · published 13 Oct 2026 · snapshot PS-004',
  chips: [
    { label: 'Simulated estimates', tone: 'info' },
    { label: 'Sample data', tone: 'muted' },
    { label: 'Reviewed internally · not a regulatory approval', tone: 'highlight' },
  ],
  preview: {
    footer: 'Pax Virentia research prototype',
    one: {
      page: '1 / 6',
      stamp: ['Snapshot PS-004', '13 Oct 2026'],
      banner: 'Simulated estimates · Sample data — not measured or validated results',
      heading: 'Scenario analysis report',
      sub: 'Sample Water District · representative plant · 1–5 Jan 2026 · 61,600 m³ treated',
      sectionHeading: '1 · Summary',
      columns: ['Scenario', 'Electricity', 'CO₂e', 'Operating cost'],
      rows: [
        [
          { text: 'Current operation' },
          { text: '24,645 kWh' },
          { text: '17,552 kg' },
          { text: '₱342,259' },
        ],
        [
          { text: 'Pax Silica pilot' },
          { text: '23,049 kWh', delta: '(−6.5%)' },
          { text: '16,415 kg', delta: '(−6.5%)' },
          { text: '₱329,163', delta: '(−3.8%)' },
        ],
        [
          { text: 'Reduced mixing' },
          { text: '23,676 kWh', delta: '(−3.9%)' },
          { text: '16,862 kg', delta: '(−3.9%)' },
          { text: '₱331,600', delta: '(−3.1%)' },
        ],
      ],
      note: 'Downstream ecosystem stress is not estimable for any scenario. The Pax Silica specification is unverified.',
    },
    two: {
      page: '2 / 6',
      heading: '2 · Inputs and assumptions',
      columns: ['Input', 'Value', 'Type'],
      rows: [
        ['Water treated', '61,600 m³', 'Sample data'],
        ['Pumping', '165 kW × 120 h', 'Assumed'],
        ['Mixer power', '51 kW · 38 kW (Pax Silica)', 'Assumed · unverified'],
        ['Electricity price', '₱11.00 per kWh', 'Assumed'],
        ['Grid emissions factor', '0.7122 kg CO₂e per kWh', 'Assumed (DOE 2023 value)'],
      ],
      note: 'Full assumptions list continues on page 3.',
    },
  },
  toc: {
    heading: 'In this report',
    rows: [
      { label: '1 · Summary', page: 'p. 1', anchor: 'report-page-1' },
      { label: '2 · Inputs and assumptions', page: 'p. 2', anchor: 'report-page-2' },
      { label: '3 · Results by scenario', page: 'p. 3', anchor: null },
      { label: '4 · Scenario comparison', page: 'p. 4', anchor: null },
      { label: '5 · Recommendations', page: 'p. 5', anchor: null },
      { label: '6 · Methodology and limitations', page: 'p. 6', anchor: null },
    ],
  },
  limitations: {
    heading: 'Limitations',
    items: [
      'Simulated estimates from sample data, not measurements',
      'One representative plant over 5 days',
      'Emissions cover electricity only',
      'Ecosystem effects are not estimable yet',
    ],
    link: 'Read the full methodology',
  },
  cite: {
    heading: 'Cite this report',
    text: 'Pax Virentia (2026). Scenario analysis — Jan 2026 sample period. Published snapshot PS-004, 13 Oct 2026. Simulated estimates from sample data.',
  },
  download: {
    file: 'Scenario analysis — Jan 2026.pdf · 6 pages · 1.2 MB',
  },
} as const;

/** P09 · Report unavailable (Figma 47:2). Standalone status page reached from
 *  the withdrawn PS-003 row on the reports page. Copy verbatim from the frame. */
export const PUBLIC_REPORT_UNAVAILABLE = {
  title: 'This report is no longer available',
  badge: 'Withdrawn',
  body: "The December 2025 snapshot (PS-003) was withdrawn on 12 Oct 2026 because its input dataset was replaced. Withdrawn reports aren't published, so nothing from it is shown here.",
  callout: {
    heading: 'What withdrawal means',
    items: [
      'The utility removed the snapshot from public view after review.',
      "Its figures shouldn't be quoted or compared with current results.",
      'The current snapshot, PS-004, covers 1–5 Jan 2026.',
    ],
  },
  primary: { label: 'See current reports', to: '/public/reports' },
  secondary: { label: 'Go to the dashboard', to: '/public/overview' },
  reference: 'Reference: PS-003 · withdrawn 12 Oct 2026',
} as const;

/** P08 · Download confirmation (Figma 45:2). Shared dialog that opens once a
 *  PDF download has started, from the report detail page and from the
 *  published report rows. Copy verbatim from the frame. */
export const PUBLIC_DOWNLOAD_DIALOG = {
  title: 'Your download has started',
  body: 'Every page is labeled as simulated estimates from sample data, and the last page lists the methodology and limitations.',
  retryLead: 'If nothing happens, ',
  retryLink: 'download it again',
  retryTail: '.',
  back: 'Back to report',
  browse: 'Browse all reports',
} as const;

export const MODEL_REGISTRY = [
  {
    module: 'energy',
    algorithm: 'deterministic v1.3',
    status: 'approved',
    training_hash: 'n/a (physics)',
    evaluated: 'Hand-worked fixture ±0.5%',
    ranges: '4,000–6,000 kWh/day',
  },
  {
    module: 'carbon',
    algorithm: 'grid-factor lookup v2026.1',
    status: 'approved',
    training_hash: 'factor-set ph-2026.1',
    evaluated: 'Arithmetic fixture 100 kWh → 50 kg at 0.5 kg/kWh',
    ranges: 'Luzon-Visayas · Mindanao · National',
  },
  {
    module: 'economics',
    algorithm: 'opex summation v1.1',
    status: 'approved',
    training_hash: 'tariff 10.45 PHP/kWh (Dec 2025)',
    evaluated: 'Fixture PHP 1,000 at 100 kWh × PHP 10',
    ranges: 'PHP, same volume/period required',
  },
  {
    module: 'ecology',
    algorithm: 'no approved model',
    status: 'not_estimable',
    training_hash: '—',
    evaluated: 'No paired observations / thresholds',
    ranges: 'Unavailable until evidence gate met',
  },
];

export function formatNum(v: number | null, digits = 0): string {
  if (v === null || Number.isNaN(v)) return '—';
  return v.toLocaleString('en-PH', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
