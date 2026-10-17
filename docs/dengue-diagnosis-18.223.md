# Adult dengue diagnosis and IV guide — 18.223.0

## Problem

The generated diagnosis used the non-guideline qualifier “without classified warning signs on current assessment”, omitted suspected/confirmed status and special populations, and could look complete before the clinician had reviewed default findings. Severe dengue also inherited a DNWS/DWWS clause. The fluid calculator could return a routine B2/febrile prescription for non-shock severe dengue.

## Source and clinical rules

Source: user-supplied **Management of Dengue in Adults, Fourth Edition (2026)**, `CPG Dengue4-121026 (2)-1.pdf`. All references are printed pages. No claim that a public official download URL for this supplied edition has been verified.

- Table 7 p30: suspected/confirmed status; complete diagnosis includes illness day, phase, DNWS/DWWS/severe dengue, shock status and comorbidities/special populations. Table 6 p28: A/B1/B2/C guide management. Group labels stay outside the copied diagnosis.
- Table 7 p30 and Recommendation 2 p31: complete and update assessment/diagnosis each visit. The explicit review checkbox, its invalidation on changed clinical inputs, and the required laboratory-evidence field for confirmed dengue are application safeguards implementing this requirement; they are not quoted CPG UI requirements. Positive tests are not automatically promoted to confirmed disease.
- Severe bleeding/organ impairment/leakage with respiratory distress are Group C even without shock (Table 6 p28; chapter 9.4). The new safeguard withholds automatic B2/maintenance prescriptions in those non-shock cases. It is not a replacement severe-dengue treatment algorithm. A recorded shock state continues to use Algorithms 2–3.
- No dose, vomiting threshold, age/BMI boundary, quota or haemodynamic classification formula is changed. Current symptoms still receive clinical reassessment even when they do not meet the phase-specific formal warning classification.

## Changes

- Both adult clerking forms require diagnosis status, a positive integer illness day and current clinical review before generating. Confirmed dengue additionally requires the laboratory basis (including prior results). Clinical changes invalidate the review; plan edits and manual output edits do not.
- Diagnosis uses concise standard wording and “not in shock” for the clinician-selected stable status. Severe dengue states severe features where recorded; no additional “without warning signs” clause. Pregnancy, age >65 and obesity are included when recorded/calculated. Comorbidities marked present need details.
- Preview asks for completion before review. Failed validation preserves existing editable notes; it does not silently replace them. Reset clears the new review/status/evidence fields for the active form.
- A small “Panduan kiraan IV (CPG4)” link beside each adult calculator opens an attributed Malay summary, with printed page references: 4/2/1 oral+IV maintenance, weight/ABW, B2 3–5 mL/kg/hour and 1-hour reassessment, shock algorithms, and non-shock quota. Existing IV NS plan wording remains concise.
- The guide explicitly distinguishes its arithmetic illustration from quoted rules and keeps the existing printed-table/formula quota discrepancy visible.

## Verification

- Node behaviour tests: suspected/confirmed, incomplete review, missing lab evidence, missing/zero/fractional/negative illness day, comorbidity details, B2, both shock types, non-shock severe dengue, pregnancy/older age/obesity, adult follow-up and paediatric bypass.
- Non-shock severe-dengue test: all three severe feature types with no-warning/febrile/B2 fluid selections produce no routine prescription; the same features with declared shock retain the initial shock calculation. Ordinary B2 remains calculable.
- Real Chromium: seven synthetic A/B1/B2/C scenarios generated and copied byte-for-byte; five referral letters generated and copied. Both new-case and follow-up controls tested for blank/confirmed validation, stale-review invalidation, preservation of manual notes and active-form reset.
- Desktop 1365px and mobile 390px: diagnosis controls, both guide links/new tabs, guide anchors and absence of horizontal overflow. Existing critical-workflow browser checks cover dengue, NNJ, DM, HPT, RME1, IUCD, ADHD and autism.

These checks cover the specified cases and are not a guarantee of zero defects in every clinical situation.
