# Adult dengue CPG4 update — 18.216.0

Source: supplied `CPG Dengue4-121026 (2)-1.pdf`, Management of Dengue in Adults, Fourth Edition (2026). Printed pages cited below. The source PDF is not republished by this change.

## Clinical changes and tests

| Rule | Source | Implementation / verification |
|---|---|---|
| No automated shock diagnosis from HR or pulse pressure alone | Algorithms 2–3, pp xv–xvi | Original inline detector neutralised, so deferred overrides cannot race against it; clinician haemodynamic selection drives classification |
| Formal warning signs near/in critical phase; persistent vomiting >3/day | pp14–15,28–30 | Shared adult assessment; boundaries 3 vs 4; phase-aware; diarrhoea remains a hydration concern |
| A/B1/B2/C disposition support | Table 6 p28 | Stable co-morbidity prompts consideration of referral; unstable co-morbidity, severe manifestations and warning signs have distinct pathways |
| Weight and maintenance | pp40–42,48 | Exact 0.91 IBW formula, ABW when BMI >27.5, 4/2/1 maintenance, cap 70 kg only for maintenance/quota; no intermediate rounding |
| Initial compensated / decompensated shock | Algorithms 2–3 | 10 mL/kg over 1 h / 20 mL/kg over 15–30 min; test 60 kg and obese adult; explicit clinical status consistency check |
| B2 initial IV when clinically indicated | pp44,46 | 3–5 mL/kg/h; reassess at 1 h per algorithm; text 1–2 h disclosed; no automatic step-down prescription |
| Quota | pp43–46,114 | One-day maintenance + 50 mL/kg over 48 h, oral + IV; table/formula discrepancy visible; agreed target separately entered |
| Home advice and urine | pp30–34 | 200 mL/h while awake or individual fluid restriction; daily review; urine frequency/measurement; explicit return precautions |
| Medicines and vaccine | pp21,29,32–34 | Structured review and date-sensitive interpretation; SGLT2 sick-day advice; contraindication-qualified medication advice |
| Stop FBC / discharge | pp30,84 | Explicit clinician decision after recovery/laboratory review; not automatic from a platelet threshold or a discharge dropdown |

## Scope and workflow

- Both New Case and Follow-up call the same adult module.
- Paediatric branches and rates are retained; adult fields are hidden when paediatric group is selected.
- Existing notes/referrals remain editable. Resets stay within their own clerking.
- Significant disposition conflicts require a documented clinician rationale; this is a software safety design, not a quoted CPG requirement.
- No patient data is transmitted or logged; existing local draft handling is retained.
- Recorded IM diclofenac or corticosteroid administration requires documented prior-exposure context or a separate indication, so documentation is not mistaken for a dengue treatment recommendation.

## Ambiguities deliberately not resolved by invention

- p44 B2 duration 1–2 h versus Algorithm 1's 1 h: display both, use 1 h reassessment.
- Exact quota formula differs from the printed table at several weights. Show formula plus exact table match; do not invent interpolation/rounding and do not silently prescribe a quota target.
- Shock severity is a clinical assessment. Do not invent a count of perfusion signs that mechanically diagnoses shock.
- Discharge guidance does not itself define an automatic software rule to stop outpatient FBC.

## Validation

- `npm test`: existing cross-module regression suite plus CPG4 normal/boundary/abnormal cases.
- Syntax checks for edited/new JavaScript assets.
- Full-document DOM integration scenarios for both adult flows, paediatric regression, generated notes, overrides and reset isolation.
- Desktop and narrow-screen smoke review before merge, then GitHub Clinical regression checks and live-asset verification per `release-safety.md`.

These checks establish the tested behaviour, not a guarantee of zero clinical/software error or independent clinical sign-off.
