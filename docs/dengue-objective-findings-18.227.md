# Objective dengue findings — 18.227.0

The adult new-case and follow-up forms now place the liver-size warning criterion under Examination / PA (abdomen) and the HCT / platelet criterion under Investigations / FBC trend. The existing serial FBC table moves beside its review checkbox. Both criteria keep their red warning styling and the same input IDs; no duplicate controls are created. The combined symptom component now has eight red fields, with two objective warning fields elsewhere in the form.

Clinical fluid accumulation now has this practical prompt: “Ask about abdominal swelling / distension or breathlessness.” The next sentence asks the clinician to identify ascites or pleural effusion on examination / imaging before ticking the finding. These are symptom examples, not new standalone dengue warning criteria; breathlessness or abdominal symptoms do not automatically check fluid accumulation.

The general hepatomegaly finding and its >2 cm qualifier share one examination box. Selecting the qualifier also records hepatomegaly; generic hepatomegaly alone does not establish >2 cm. Clearing hepatomegaly or deselecting the abdomen examination clears the >2 cm qualifier. A restored positive qualifier exposes the abdomen examination. The generated PA line records the actual >2 cm finding.

The FBC review checkbox remains clinician-confirmed. A single FBC does not establish a trend, and numeric changes are not automatically classified as rapidly falling platelets. A checked trend is now explicitly included in the investigations of both notes and referrals, including severe dengue where the diagnosis line does not list the individual warning findings.

Adult/paediatric and dengue/non-dengue switching restores the original controls and serial table location. Existing phase interpretation, warning thresholds, grouping, referral rules and IV fluid calculations are unchanged.

## Sources

- Supplied *Management of Dengue in Adults*, Fourth Edition (2026), printed p10: liver enlargement >2 cm and laboratory findings of rising HCT with rapidly falling platelet count. Printed p36: ultrasound assessment of third-space accumulation, including ascites and pleural effusion.
- NHLBI, *Pleural Disorders — Symptoms*: https://www.nhlbi.nih.gov/health/pleural-disorders/symptoms (shortness of breath).
- NIDDK, *Symptoms & Causes of Cirrhosis*: https://www.niddk.nih.gov/health-information/liver-disease/cirrhosis/symptoms-causes (abdominal swelling from ascites). Used only to support the symptom description, not to define dengue criteria.

## Verification

- Edited JavaScript syntax checks and all 100 regression tests passed.
- Browser checks passed for both adult dengue forms: new field locations, no duplicate questions, shared hepatomegaly/size behaviour, warning interpretation, generated examination and FBC text in notes/referrals, manual edit/copy, reset and form-switch restoration.
- Diagnosis review and validation, concise plans and fluid calculations passed. NNJ, DM, HPT, RME1, IUCD, ADHD and Autism workflow checks passed.
- Desktop (1365 px) and mobile (390 px) screenshots inspected; no page-level horizontal overflow or runtime errors.
