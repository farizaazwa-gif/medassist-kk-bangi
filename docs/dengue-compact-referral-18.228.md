# Compact referral and fluid-accumulation symptoms — 18.228.0

Both adult dengue forms use one compact **Hospital referral** panel. Severe bleeding (needs intervention) and respiratory distress due to plasma leakage remain under Severe dengue; unstable comorbidity and moderate–severe dehydration remain under Other indications. Shock and severe organ involvement still use their existing assessment fields. The four checkboxes retain their IDs and clinical rules. A small CPG reference link replaces repeated explanatory headings and large individual option cards.

The red **Clinical fluid accumulation** symptom box now contains:

- Abdominal swelling / distension: a new selectable symptom.
- Shortness of breath: the existing input, moved into this group with its duration controls. It is not duplicated elsewhere.
- Ascites / pleural effusion present: the existing clinician-assessed fluid-accumulation criterion, separated from the symptom questions.

The symptom selections do not automatically establish fluid accumulation or severe plasma leakage. The helper requests examination/imaging confirmation for the existing finding. Positive symptoms and a confirmed finding are included in both generated notes and referrals, including severe dengue. New-case SOB no longer depends on being inside the old associated-symptom container for note generation; follow-up has one explicit SOB history entry without repeating its old concern wording. Paediatric and non-dengue forms restore the existing SOB control and retain their previous workflow.

## Guideline mapping

Source: supplied *Management of Dengue in Adults*, Fourth Edition (2026).

- Printed p12: severe bleeding significant enough to require medical intervention.
- Printed pp13–14 and Table 6 p28: severe organ involvement and severe dengue classification; plasma leakage with shock or respiratory distress.
- Table 6 p28: unstable comorbidities require hospital referral. Stable comorbidity alone is not automatically severe dengue.
- Printed p31: moderate–severe dehydration requires IV therapy and hospital management.
- Printed pp10,28,36: fluid accumulation and identification of ascites / pleural effusion, including examination and imaging context.

The two symptom prompts explain possible presentations; they are not newly invented CPG warning-sign criteria. Supporting symptom descriptions: [NHLBI pleural disorders](https://www.nhlbi.nih.gov/health/pleural-disorders/symptoms) and [NIDDK ascites description](https://www.niddk.nih.gov/health-information/liver-disease/cirrhosis/symptoms-causes). The NIDDK source supports the meaning of abdominal swelling from ascites, not dengue management.

## Verification

- Edited JavaScript syntax and all 100 regression tests passed.
- Browser checks in both forms: all four referral criteria still require hospital assessment; only the two severe criteria establish group C by themselves.
- SOB/distension alone do not select fluid accumulation or severe plasma leakage, including in the critical phase. The separately selected fluid finding remains part of warning-sign interpretation.
- Symptom and confirmed-finding text survives note/referral generation; SOB appears once without a contradictory negative. Copy/edit/reset, diagnosis review, adult/paediatric/non-dengue switching and fluid calculations passed.
- Other critical clerking workflows passed. Desktop/mobile screenshots inspected; no runtime errors or page-level horizontal overflow.
