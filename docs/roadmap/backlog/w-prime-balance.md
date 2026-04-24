---
title: W′ balance per activity
status: Planned
target: —
---

## Goal

Render the real-time W′ (D′) depletion curve during an activity — show exactly when the runner dipped into their anaerobic reserve and how it recovered.

## Scope

- [ ] Per-second W′ balance calculation from pace records + runner's CS/D′ fit
- [ ] Line chart on activity detail page, aligned with pace/HR chart
- [ ] Highlight depletion events (W′ < 20% of D′)

## Technical notes

- Depletion formula: `W'_bal(t) = D' - ∫(pace(τ) - CS) dτ` for τ where pace > CS, with exponential recovery below CS (Skiba et al. 2012 integral form).
- Requires a valid CS + D′ fit for the user; gracefully hide the chart otherwise.
- Computation is O(n) in record count; can be done on-demand at page load (no schema changes needed initially).
- Complements the existing Critical Speed chart: CS shows the *ceiling*; W′ balance shows how the runner spent against it *within a single run*.

## Reference

- Skiba, P. F., et al. (2012). "Modeling the expenditure and reconstitution of work capacity above critical power."
