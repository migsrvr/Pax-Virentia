# Pax Virentia domain language

Proposed glossary for the water-treatment scenario simulator described in the supplied chapters. Treatment terminology and ecological targets remain subject to adviser review.

## Study and treatment

**Pax Virentia**:
The proposed decision-support system for comparing economic and environmental consequences of water-treatment operating scenarios.
_Avoid_: plant controller, regulatory certification system.

**Pax Silica treatment specification**:
The technical definition of the intervention called Pax Silica in Chapter 1. Its identity as a water-treatment technology is unverified until a suitable technical source resolves the issue identified in Chapter 2, pages 26-27.
_Avoid_: established treatment method, guaranteed efficiency improvement.

**Representative plant**:
The single modeled Philippine water-treatment facility scenario used in the study. It does not represent a validated sample of all facilities.
_Avoid_: nationwide plant network.

**Offline plant model**:
A representation of plant behavior used to evaluate proposed operating conditions without live sensor synchronization. This is the bounded meaning of the thesis's Digital Twin Model.
_Avoid_: real-time digital twin, live monitoring.

## Evidence and scenarios

**Source version**:
A specific edition or capture of evidence with identifiable origin, time coverage, units and usage conditions.
_Avoid_: latest data, unexplained reference value.

**Dataset version**:
An immutable collection of observations, with its source lineage and data-quality decisions.
_Avoid_: scenario, result.

**Scenario**:
A proposed combination of plant operating conditions and treatment assumptions over a defined service volume and period.
_Avoid_: prediction, simulation result.

**Baseline**:
The reference scenario against which an intervention is compared using the same service volume, period and accounting boundaries.
_Avoid_: default ideal, guaranteed ground truth.

**Intervention**:
The proposed treatment or operational change being evaluated relative to a baseline.
_Avoid_: proven improvement.

**Run**:
One evaluation of a specific scenario revision against fixed data, factors and model assumptions.
_Avoid_: scenario, conversation.

## Outputs and interpretation

**Electricity-associated emissions**:
Greenhouse-gas emissions attributed to purchased or modeled electricity under the selected grid-factor boundary. They do not by themselves constitute a complete facility footprint.
_Avoid_: total environmental impact, complete LCA.

**Grid emission factor**:
An evidence-based amount of specified greenhouse-gas emissions per unit of electricity, applicable to a stated geography, period and accounting method.
_Avoid_: universal carbon constant.

**Operating cost**:
The cost of operating over a stated period, with explicitly defined electricity, chemical, labor, maintenance and other inclusions.
_Avoid_: capital cost, total lifetime cost.

**Net operating savings**:
Baseline operating cost minus intervention operating cost for a compatible comparison. Negative savings mean a cost increase.
_Avoid_: revenue, profit.

**Ecological indicator**:
A defined outcome or proxy concerning ecosystem condition, supported by an explicit method, input evidence and interpretation boundary.
_Avoid_: certified damage score, emissions-derived local damage without evidence.

**Not estimable**:
A scientific output state meaning the available evidence or model does not support a value. It is distinct from zero impact and from a software failure.
_Avoid_: safe, no damage, zero.

**AI explanation**:
A generated narrative describing approved numerical results and their limitations. It is not independent evidence or the numerical simulation itself.
_Avoid_: validated prediction, authoritative recommendation.

**Public snapshot**:
A reviewed, simplified and intentionally published representation of selected results and their source limitations.
_Avoid_: live private dashboard, government approval.
