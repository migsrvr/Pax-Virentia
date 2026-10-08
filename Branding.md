# Pax Virentia — UI & Branding Proposal

**Version:** 0.1  
**Date:** 9 October 2026  
**Status:** Proposed visual direction for review  
**Basis:** [Domain context](CONTEXT.md) and [System design](Pax-Virentia-System-Design.md)

This document proposes the identity, navigation, screen layouts, and interface behavior for Pax Virentia. It is a design brief, with text wireframes rather than application code. Colors, fonts, and the logo concept are recommendations; no finished logo or licensed asset package is included.

## 1. Product identity

Pax Virentia is a decision-support workspace for comparing water-treatment operating scenarios. Analysts and plant operators prepare evidence, define scenarios, and compare energy demand, electricity-associated emissions, and operating costs. Reviewers inspect findings before public release.

The interface should feel **calm, precise, and environmentally aware**. Its credibility should come from visible sources, clear units, and honest limitations.

**Suggested descriptor:** Water-treatment scenario analysis  
**Suggested tagline:** Compare scenarios. Understand the tradeoffs.

Use the descriptor on sign-in and introductory pages. Inside the workspace, prioritize the current task and plant context over promotional copy.

### Direction considered

| Direction | Strength | Tradeoff |
| --- | --- | --- |
| **Scientific workspace with an environmental identity — recommended** | Supports careful comparison and readable evidence; teal and green establish character | Needs deliberate layouts to avoid looking like a generic dashboard |
| Nature-led identity with prominent organic illustration | Approachable for public summaries | Can distract from analysis or suggest environmental benefits before evidence supports them |
| Dark technical console | Strong specialist character | Less suitable as the default for long forms, review, and printable reporting |

Use the recommended direction for the private workspace. Public summaries can be warmer and simpler while retaining the same brand.

## 2. Brand kit proposal

### Color palette

| Name | Hex | Intended use |
| --- | --- | --- |
| River Teal | `#135D66` | Primary buttons, selected navigation, key headings |
| Canopy Green | `#41745B` | Intervention series and environmental accents |
| Slate Ink | `#24343D` | Main text and baseline chart series |
| Mist | `#F3F7F8` | Workspace background and quiet section surfaces |
| White | `#FFFFFF` | Forms, panels, and report backgrounds |
| Evidence Amber | `#8A5700` | Incomplete evidence and caution text on pale backgrounds |

Use teal sparingly so the primary action stands out. Use amber for evidence limitations, with an explicit label and explanation. Use a separate accessible red treatment for errors or destructive actions.

Green must not automatically mean that a scenario is sustainable. A decrease in one metric can coexist with an increase in another. Compare metrics individually rather than coloring an entire scenario as good or bad.

These are starting tokens. Check text, focus indicators, chart marks, and button contrast in their actual combinations before implementation.

### Typography

- **Headings and brand wordmark:** Manrope, medium or semibold; gives the identity a clear, contemporary shape.
- **Body, forms, tables, and navigation:** Source Sans 3; prioritize comfortable reading and distinguishable characters.
- **Numeric results:** tabular numerals where supported, with consistent alignment and visible units.
- **Fallback:** system sans-serif if the chosen fonts cannot load.

Suggested desktop scale: page title 28–32 px, section title 20–24 px, body 16 px, and supporting labels 14 px. Avoid tiny labels for sources or scientific limitations.

### Logo concept

Explore a simple **water-flow line forming the letter P**. It should work as a one-color symbol, a small navigation mark, and a wordmark beside “Pax Virentia.”

Keep the geometry clear at small sizes. Avoid detailed leaf-and-water collages, certification seals, or symbols that imply government endorsement. A future asset kit should include horizontal, symbol-only, monochrome, and reversed versions with clear-space guidance.

### Supporting visual language

Use restrained line icons for datasets, scenarios, runs, reports, and settings. Use rounded corners moderately, subtle borders, generous spacing, and minimal shadows. Avoid decorative nature imagery in analytical screens.

The signature element is a **baseline–intervention comparison rail**: two consistently identified scenarios, followed by their evidence compatibility and metric differences. Reuse this structure in results and reports so users recognize the central task.

### Voice

Write short, specific labels: “Create scenario,” “Run simulation,” “View sources,” and “Explain these results.” Avoid claims such as “AI-certified,” “zero ecological impact,” or “guaranteed savings.”

Keep “scenario” distinct from “run.” A scenario defines assumptions; a run evaluates a fixed revision of those assumptions.

## 3. Navigation and workspace structure

Use a desktop sidebar with the following destinations:

| Destination | Main job |
| --- | --- |
| Overview | Show the next useful action, recent scenarios, and run activity |
| Datasets | Import, validate, and inspect versioned input evidence |
| Scenarios | Create and revise baseline and intervention assumptions |
| Results | Inspect runs and compare compatible findings |
| Reports | Prepare exports and review publication status |
| Settings | Manage authorized workspace settings, factors, models, and users |

Show the workspace name and representative plant near the top. Keep user/account controls secondary. Hide actions unavailable to a role, and explain read-only access where it affects an otherwise visible workflow.

Public visitors receive a separate simplified published page. They do not enter the private workspace or see unpublished source files.

## 4. Main user journey

1. Select or import a dataset and resolve validation issues.
2. Create a baseline scenario with its period, volume, operating conditions, and evidence.
3. Create an intervention scenario with explicit changes and assumptions.
4. Review inputs and launch simulation runs.
5. Compare compatible completed runs and inspect limitations.
6. Request a Gemini explanation if useful.
7. Export an authorized report or submit a public snapshot for review.

Keep numerical results available even if explanation generation fails. Save scenario drafts independently of launching a run.

## 5. Screen concepts

### A. Overview

The first screen should answer “What can I do next?” rather than displaying a wall of statistics.

```text
Pax Virentia | Overview                         Create scenario

Representative plant · Offline scenario analysis

Next step
Select a validated dataset to prepare your first baseline.
[View datasets]

Recent scenarios                     Run activity
Name / revision / last updated       Scenario / state / started

Workspace evidence
Dataset coverage · factor availability · unresolved limitations
```

For an empty workspace, show a three-step introduction: add evidence, define a scenario, run a comparison. Do not display fabricated charts or zero values that appear to be measured results.