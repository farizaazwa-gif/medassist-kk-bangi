# Adult dengue assessment integration — 18.233.0

## Problem and change

Ascites checked under Examination → Abdomen was documented in the examination but omitted from adult dengue classification unless the separate fluid-accumulation checkbox was also selected. Both New Case and Follow-up now include that examination finding in the shared assessment, warning interpretation, diagnosis and referral advice.

The prescribed fluid restriction previously changed oral advice only. It now prevents a routine non-shock maintenance/B2 IV order and standard quota estimate. The interface asks for an individual prescription and keeps the hospital-assessment recommendation. Regimen text is a clinical record; it is never parsed into a dose. In recorded shock the initial emergency pathway remains available, with restriction, individual titration, frequent perfusion/respiratory reassessment and urgent transfer stated in the displayed result and copied plan.

The former “Adult dengue — CPG Fourth Edition” box is labelled “Assessment review”. The same fluid-restriction inputs now sit under Oral intake. The same frequency and measured-urine inputs sit in an optional disclosure under PU. They continue to populate the clerking note, without duplicated controls or requiring measured output for every outpatient. The existing CPG reference remains a link.

## Urine interpretation

- Measured output is volume / actual body weight / measurement hours.
- A valid average below 0.5 mL/kg/hour prompts clinical reassessment. A positive low average alone does not automatically establish a 4–6-hour warning sign; the clinician confirms duration and perfusion.
- Zero measured urine over at least 4 hours provides an absent-urine finding. It uses the existing phase-sensitive warning interpretation; it does not diagnose shock.
- Fewer than 4 recorded voids/24 hours prompts reassessment of volume and last void time; frequency alone is not a dengue warning sign.
- Measured low/absent output cannot be copied as normal merely because the qualitative selector still has its default. The visible urine summary identifies the inconsistency without overwriting clinician input.
- Paediatric and non-dengue pathways retain their existing inputs and interpretation. The adult controls keep their IDs and move back to their original hidden section when the adult dengue workflow is inactive.

## Source and boundaries

Supplied **Management of Dengue in Adults, Fourth Edition (2026)**, file `CPG Dengue4-121026 (2)-1.pdf`, printed pages:

| Rule | Source |
| --- | --- |
| Fluid accumulation; reduced/absent urine for 4–6 hours; phase context | p10; pp14–15 |
| Prescribed restrictions; minimum urine 0.5 mL/kg/hour; 4–6 voids/day and at least once every 6 hours | p31 |
| Excessive fluid and failure to adjust for heart/kidney comorbidity | p40 |
| Individual titration, reassessment and emergency shock pathways | p48; Algorithms 2–3 |

The automatic measured-urine review rules above are explicit application interpretations of those clinical guides. No new shock classification, free-text prescription calculation or fixed subsequent infusion schedule is introduced.

## Regression evidence

Focused tests exercise both workflows, including examination-only ascites, normal output at 0.5 versus output below that boundary, absent urine at the 4-hour boundary, frequency-only concerns, phase changes, clearing recorded measurements, and the copied PU line. Restriction cases cover an empty regimen, unrestricted/restricted febrile maintenance, B2 admission advice, and both shock pathways with the restriction retained in the copied plan. Existing critical-workflow and editable-note tests remain part of the full suite.

Browser smoke verification uses the published application at desktop and 390 px widths. The cloud browser does not permit local `file:` previews; no local URL-policy bypass is used.
