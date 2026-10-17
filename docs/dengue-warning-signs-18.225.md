# Adult dengue warning-sign panel clarity — 18.225.0

The previous panel showed seven direct warning-sign checkboxes while three findings were read from Symptoms and hydration. It also mixed illness phase, severe dengue and other referral findings into the same checklist, obscuring what the clinician needed to review.

Both adult clerking forms now display all ten findings together, numbered in the order used on printed page 10 of the supplied Management of Dengue in Adults, Fourth Edition (2026), CPG Dengue4-121026 (2)-1.pdf. Vomiting, mental state and bleeding remain single-source history inputs; their current values are displayed in the panel with buttons to edit the original fields. No duplicate clinical inputs are added.

Illness phase and clinician confirmation are visually separate from the ten findings. Severe dengue and other referral findings have a separate card. A symptom recorded outside the phase-based classification is explicitly shown as needing interpretation rather than disappearing behind a generic review message. Severe dengue takes precedence in the panel summary.

Source mapping: the ten findings are on p10; phase-based interpretation is on pp14–15; management grouping is on p28. Examples of fluid accumulation (pleural effusion, ascites) are described on p36. Existing thresholds, classification, fluid calculations, referral triggers, generated notes and paediatric rules are unchanged. The assessment API now additionally exposes the already-recorded warning findings to explain the displayed result.

Verification: JavaScript syntax checks and all 100 regression tests passed. Real-browser checks covered both forms, all ten displayed items, edit navigation back to history, live history values, the adult vomiting boundary (3 vs 4 episodes), febrile vs near/critical-phase interpretation, severe-dengue summary priority, note/referral generation, editable output, clipboard, reset isolation, adult/paediatric switching and desktop/mobile layouts. Critical workflows for DM, HPT, NNJ, RME1, IUCD, ADHD and Autism also passed.
