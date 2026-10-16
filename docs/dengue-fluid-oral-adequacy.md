# Fluid calculation: oral tolerance versus adequacy

Release: 18.218.0

## Reported behaviour

The Calculate fluid button returned a no-IV message for a 65 kg adult in the B2 pathway at a selected rate of 4 mL/kg/hour. The implementation treated the existing oral-tolerance dropdown (`able` / follow-up `good`) as proof of sufficient intake. Both workflows also defaulted to these values. Tolerance alone does not establish the amount consumed or its adequacy.

## Source and bounded correction

Source: supplied **Management of Dengue in Adults, Fourth Edition (2026)**, printed pp41–42, p44 and Algorithm 1 on p46. The text distinguishes inadequate intake, dehydration, and tolerance of sufficient fluid; p44 states that oral intake equivalent to 1–2 mL/kg/hour can remove the need for IV. Algorithm 1 gives an initial 3–5 mL/kg/hour for B2, followed by reassessment.

This interface does not estimate adequacy from the tolerance label. For adult febrile/B2 calculations with preserved oral tolerance and no recorded dehydration, it requests explicit clinician assessment of oral intake adequacy. The blank state requests assessment; adequate intake withholds a routine IV rate; inadequate intake permits calculation only after the existing phase, warning-sign, haemodynamic, weight and rate checks pass. Febrile maintenance still requires measured hourly oral intake and deducts it. No rate, cap, formula or referral rule changed.

The assessment is cleared when relevant measurements, oral tolerance, hydration, phase, category or patient group change, and on reset. It is included in generated notes when applicable. Paediatric and shock pathways do not use this extra field. Results without a dose now have a short heading and explanatory text.

## Verification

- 84 regression tests, including the reported 65 kg / 4 mL/kg/hour scenario: unknown prompts assessment, adequate withholds IV, inadequate calculates 260 mL/hour when other conditions are fulfilled.
- Full-document integration checks for both new case and follow-up, generated-note consistency, clearing stale adequacy, adult/paediatric transitions, reset isolation and runtime errors.
- Desktop and narrow mobile preview required before merge.

Passing these scenarios is not a guarantee that all possible clinical or software errors are absent.
