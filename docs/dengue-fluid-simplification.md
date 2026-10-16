# Dengue fluid display and bug fixes — 18.217.0

## Changes

- Both New Case and Follow-up show calculation weight, clinical category, Calculate and a short result first.
- Oral intake appears for febrile maintenance only. Adult fixed shock rates no longer require a second dropdown. B2 and paediatric rate choices remain available.
- Weight override, fluid record/quota and guideline references are collapsed initially. Dose, reassessment and transfer actions remain visible. Full calculation/source text remains available and generated notes retain the complete instructions.
- No CPG dose, threshold or formula is changed.

## Confirmed defects

1. An adult 60 kg / 600 mL result remained visible after changing to a 20 kg paediatric patient. Group changes now invalidate the old result; paediatric input changes require recalculation.
2. Paediatric calculation immediately after a weight edit could use a stale derived weight (20 kg entered but 50 kg cached, giving 500 mL instead of 200 mL for the selected 10 mL/kg scenario). Both paediatric functions now read current actual weight directly and reject non-positive/non-finite values.
3. New CPG displays were rebuilt repeatedly during the legacy bulk reset. CPG refresh is batched during reset, the result prompt and validation are reset, and disclosure controls are preserved when unchanged inputs are edited.

## Verification

- 81 dependency-free automated tests, including current-vs-cached paediatric weight and compact result/complete-note consistency.
- Full-document integration: both adult flows, adult weight updates, paediatric group changes, immediate recalculation, oral-adjusted maintenance and generated notes. Accessibility hardening is omitted only in the jsdom harness for performance; real-browser smoke tests load all assets.
- Desktop and 390 px browser smoke tests plus CI must pass before merge; verify published files after deployment.

These checks cover the tested paths; they do not establish absence of every bug or independent clinical validation.
