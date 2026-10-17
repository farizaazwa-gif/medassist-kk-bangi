# Combined adult dengue symptom assessment — 18.226.0

The adult new-case and follow-up forms previously repeated symptom questions across Associated symptoms, Symptoms and hydration, Warning signs and Three salient questions. This release places the existing inputs in one Symptoms & daily assessment component.

- Oral intake, urine output (PU) and activity appear together.
- The ten existing CPG4 warning-sign criteria are marked with pale red boxes, red borders and a text legend. Colour identifies criteria to assess, not an automatically positive finding.
- Abdominal pain and its intense/tender qualifier share a box. Urine output and the 4–6-hour qualifier share a box. Vomiting, mental state and bleeding are editable directly; the separate history mirrors are hidden.
- Other associated symptoms, onset fields and conditional TB screening remain available in the same component. Unselected associated symptoms do not display disabled onset inputs.
- The oral amount and unit are entered once, shared with the fluid calculator, and included in the oral history in both generated notes. The redundant new-case poor-intake checkbox is not part of the adult symptom list; clDrink is the existing canonical oral-tolerance assessment.
- Illness phase and clinician confirmation remain available. Severe dengue and other referral findings remain separate clinical assessments.

The layout moves existing DOM controls with their IDs, values and event listeners rather than cloning inputs. Paediatric and non-dengue layouts restore those controls to their original positions. Existing warning-sign criteria, phase interpretation, groups, referral triggers, thresholds and fluid formulas are unchanged. Source remains the supplied Adult Dengue CPG Fourth Edition (2026), printed pp10,14–15,28.

Verification: edited JavaScript syntax checks; 100 regression tests; real-browser checks of both forms, one instance of each shared input, ten red warning-sign fields, conditional TB questions, vomiting boundary and phase interpretation, notes/referrals, one oral amount with its explicit unit, fluid calculations, manual editing/copy, reset isolation, switching adult/paediatric/non-dengue forms, and desktop/mobile layouts. DM, HPT, NNJ, RME1, IUCD, ADHD and Autism workflow checks passed.
