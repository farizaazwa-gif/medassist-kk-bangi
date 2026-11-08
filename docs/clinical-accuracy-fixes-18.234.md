# Clinical accuracy fixes — v18.234.0 (8 Nov 2026)

| Area | Before | After | Source |
|---|---|---|---|
| Paediatric dengue fluid weight (new case + follow-up) | Always actual body weight; weight basis locked | WHO BMI-for-age screen (0–5 y: overweight >+2 SD, obese >+3 SD; 5–19 y: >+1 SD / >+2 SD). Overweight/obese child: fluid not calculated on actual weight until a paediatric IBW is entered. Adult Devine formula no longer applied to children. | CPG Management of Dengue in Children 2nd Ed (2020), p19 and Appendix 7 (pp47–48) |
| HPT target BP | `<130/80` for everyone <80 y; "individualise" ≥80 | Most <140/90; DM <140/80 (consider <130/80 if younger); CKD proteinuria >1 g/day <130/80; lacunar stroke <130/80; 65–79 consider SBP <130 if fit; ≥80 <150/90 | CPG Management of Hypertension 5th Ed (2018), pp16–19, 45 |
| HPT BMI category | WHO international (25/30) | Malaysian/Asian adult cut-offs (23/27.5), same as DM module | Malaysian CPG Management of Obesity |
| Paediatric IV hydrocortisone | 4 mg/kg, no maximum | 4 mg/kg, maximum 100 mg/dose; note shows when capped | BNFc (max 100 mg for 5–17 y). Lower age-band maxima for younger children not applied — confirm with Paediatric Protocols |
| RME 1 VTE score | Missing age >35, parity ≥3, gross varicose veins, multiple pregnancy, preterm birth | Age and parity auto-scored from booking data; multiple pregnancy auto from ultrasound; varicose veins and preterm birth added as checkboxes | RCOG Green-top 37a risk assessment tool. Existing KKM-flowchart scores (surgery / hyperemesis = 4) left unchanged pending review of the KKM flowchart |
| RME 1 GDM risk | Age >25 counted as an early-OGTT risk factor | Age alone not an early-OGTT trigger; covered by universal OGTT at 24–28 weeks | CPG Management of Diabetes in Pregnancy (2017), p2 |
| Paediatric vital-sign bands | Labels "6–12 years", "13–18 years" (5–6 y gap) | ">5–12 years", ">12–18 years" (ranges unchanged) | Label fix only |

Tests: `tests/clinical-accuracy-fixes.test.js` (8 new tests); updated BMI boundary and paediatric fluid tests. Full suite: 139/139 pass.

Not changed (not independently verifiable without source PDFs): adult dengue CPG4 rules, NNJ PT/ET tables, NAG doses, aspirin PET dose.
