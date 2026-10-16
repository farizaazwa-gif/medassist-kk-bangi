# Dengue fluid pathway consistency — 18.219.0

## User-reported case

The result was withheld because the selected febrile fluid category conflicted with the phase recorded in Diagnosis Builder. The button had executed; the existing phase guard correctly stopped an incompatible regimen. The interface nevertheless allowed this contradictory choice, and did not show the upstream assessment alongside the calculator.

The screenshot also contained oral intake 1000 in a field labelled mL/hour. Its intended interval was not known, so it must not be silently interpreted as a daily total.

## Changes and findings

- Restrict adult fluid choices to recorded phase, warning signs and clinician-selected haemodynamics. Resolve a stale/incompatible calculator choice to a compatible pathway without editing the patient's clinical assessment. Recovery has no automatic critical-phase regimen. Both shock pathways remain linked to declared haemodynamics.
- Show the recorded assessment next to the calculator and provide a Review assessment button that focuses the source phase field.
- Keep paediatric choices separate and restore all applicable choices when changing patient group.
- Add an explicit mL/hour versus mL/24 hours input unit. The hourly equivalent is shown; a daily average must be confirmed as representative of current intake. Conversion uses full precision before display rounding.
- Show effective capped calculation weight for adult febrile/B2 maintenance, and the uncapped selected weight for shock. Previously the headline displayed 72 kg although maintenance used 70 kg.
- A zero maintenance IV component is displayed as zero, with an explanation. The generated IV-start action cannot be approved as a zero-rate prescription; the user must untick Start IV fluid if none is intended.
- Propagate explicitly inadequate oral intake into the assessment as a need for clinical reassessment, even when oral tolerance is preserved. This does not create an automatic admission trigger.
- Avoid routine outpatient reassurance when the no-warning calculator category is inconsistent with recorded hospital-referral findings.
- Use one adult Calculate renderer. Previously both legacy and CPG handlers wrote to the result on each click. The paediatric renderer is preserved.
- Version the two dengue assets with this release to avoid reusing older cached script versions with updated markup.

## Clinical provenance

Source: supplied *Management of Dengue in Adults, Fourth Edition (2026)*. Febrile maintenance and oral/IV balance: pp40–42. B2: p44 and Algorithm 1 p46. Shock: Algorithms 2–3. Weight basis and maintenance cap: pp40,48. These changes retain existing rates, formulae, weight thresholds and referral rules. Input compatibility and unit conversion are application logic, not new CPG recommendations.

## Verification

- 90 Node regression tests pass, including a matrix of febrile/critical/recovery, both shock states, warning-sign status and approaching-critical status.
- `scripts/qa-dengue-fluid.cjs` runs against the full actual document with jsdom 26 supplied through `MEDASSIST_JSDOM_MODULE`. It covers both new case and follow-up: stale category repair, 72 kg cap, 1000 mL/hour versus 1000 mL/24 h, repeated button clicks, source-field focus, generated notes, zero-IV validation, recovery, shock, paediatric transitions, stale doses and reset isolation.
- The jsdom harness omits accessibility-hardening.js due to its jsdom performance; browser smoke testing includes the complete application.
- Desktop and 390 px browser smoke testing and live asset verification are release gates.

This scope does not establish that every possible application or clinical error is absent.
