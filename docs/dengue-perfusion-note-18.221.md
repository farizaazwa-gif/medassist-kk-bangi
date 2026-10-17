# Dengue perfusion documentation — 18.221.0

Simulation exposed normal examination text despite a recorded shock state and
separate abnormal findings. An existing extension already provides editable O/E
selectors, but the note generator inserted a fixed normal sentence and a delayed
handler rewrote outputs. That handler also searched unrelated textareas globally.

Both note generators now read the existing O/E selections synchronously. A shock
state with untouched normal selections produces an explicit review prompt instead
of claiming normal perfusion. Existing O/E controls and normal-case defaults remain.
Removed delayed and copy-time rewrites: edited output and other clerkings stay intact.
New-case symptom negatives omit "no poor oral intake" when oral tolerance is reduced
or absent. No dose, diagnostic threshold or referral rule changed.

Simulation source: user-supplied Management of Dengue in Adults Fourth Edition
(2026), Algorithm 2, printed p xv. Crystalloid 10 mL/kg over 1 hour in compensated
shock: 600 mL for 60 kg, with reassessment and immediate hospital transfer.

Browser checks cover a shock state with unreviewed findings, selected abnormal
findings, explicit normal findings, both note/referral outputs, edited-copy
preservation, reset and desktop/mobile layouts. Existing regression checks apply.
