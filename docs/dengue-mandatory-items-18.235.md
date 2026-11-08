# Dengue mandatory items and CCMS wording — v18.235.0 (8 Nov 2026)

## CCMS
All on-screen "TPC-OHCIS" wording (paste boxes, import panels, status messages) now reads "CCMS". Parsers are unchanged.

## Mandatory before "Generate clinical note" / "Generate ED referral letter"
Applies to the new-case and follow-up dengue clerking. Saving a draft is not blocked.

| Item | Field(s) | Rule |
|---|---|---|
| Weight | Weight (kg) | > 0 |
| 1. Diagnosis | Diagnosis type (new case); adults: suspected / confirmed | Selected; "Other" needs text; confirmed needs laboratory evidence |
| 2. Day of illness | Day of illness | Whole number ≥ 1 |
| 3. Phase | Phase | Selected (no default) |
| 4. Warning signs | New "4. Warning signs" selector | With / without chosen. Set to "With" automatically when findings are recorded ("Without" then locked). "With" needs at least one recorded sign; adult clinician confirmation needs the specific sign / rationale |
| 5. Shock status | Shock status | Selected (no default) |
| 6. Comorbidities | Comorbidities | With / without chosen; "With" needs the list (top-level comorbidity in the new case counts) |
| Adults only | "Clinical assessment reviewed" tick | Required — the CPG4 diagnosis is not produced without it |

If anything is missing, a pop-up lists the items, the fields are outlined in red, and tapping an item jumps to it. Non-dengue diagnoses in the new-case form require only the diagnosis and weight.

## Related fixes
- Blank shock status is no longer read as shock by the paediatric referral banner (previously any value other than "haemodynamically stable" counted as shock).
- Comorbidity status is no longer forced to "No comorbid" when the top comorbidity box is empty.
- Adult (CPG4) diagnosis text shows "Diagnosis pending clinical assessment" until phase, shock, warning-sign and comorbidity status are chosen.

Tests: `tests/dengue-required.test.js` (8 new); CPG4 UI fixtures updated. Full suite 147/147.
