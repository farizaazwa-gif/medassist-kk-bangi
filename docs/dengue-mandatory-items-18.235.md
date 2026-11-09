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

## v18.236.0 (9 Nov 2026)
- Adult "Generated diagnosis" no longer shows a bare "Diagnosis pending clinical assessment." It now names what is still required (e.g. "Still required: 3. phase; 6. comorbidities."). Group B2 can appear before the phase is selected when "Approaching critical phase" is ticked, which made the pending state confusing.
- Severe organ involvement without documented details is now listed in the required-items pop-up (it already blocked the adult diagnosis).

## v18.237.0 (9 Nov 2026)
- "3. Phase" now always sits in the Diagnosis Builder (adults and children, new case and follow-up), between "2. Day of illness" and "4. Warning signs". The adult warning-sign panel shows the current phase with a pointer to the builder.

## v18.238.0 (9 Nov 2026)
- Removed the "Clinical assessment reviewed for this diagnosis" tick (new case and follow-up). The adult diagnosis is produced as soon as the required items are filled; the pop-up no longer asks for the tick.

## v18.239.0 (9 Nov 2026)
- Adult dengue diagnosis writes "without comorbid" instead of "NKMI" when there is no comorbidity. The separate comorbidity line in the note is unchanged.

## v18.240.0 (9 Nov 2026)
Standard diagnosis sentence for every dengue form (adult and paediatric, new case and follow-up):

`Treat as [probable] dengue fever | severe dengue, D<n> of illness, in <phase>, with/without warning signs, with <compensated/decompensated> shock | not in shock, with comorbid <list> | without comorbid.`

- Suspected dengue → "Treat as probable …"; confirmed dengue → "Treat as …" (no "probable").
- Severe dengue omits the warning-sign clause (severity details stay in brackets).
- Paediatric forms have no suspected/confirmed field, so they read "Treat as dengue fever, …".

## v18.241.0 (9 Nov 2026)
- Warning signs are named in the diagnosis whenever present, including severe dengue, e.g. "Treat as probable severe dengue, D5 of illness, in critical phase, with warning signs (persistent vomiting (5 episodes/24 h)), with compensated shock, without comorbid."

## v18.242.0 (9 Nov 2026)
- **1. Diagnosis** now has "Dengue fever (confirmed)" and "Probable dengue fever", and starts blank ("— Select —"). It sets the diagnosis wording on every dengue form: "Treat as dengue fever …" or "Treat as probable dengue fever …". The follow-up Diagnosis Builder gains the same item 1. Paediatric forms follow it too.
- **Assessment review removed** from the Diagnosis Builder (new case and follow-up). That removes the separate suspected/confirmed selector and laboratory-evidence entry, the vaccination and medication review, and the management-group summary box. The urine record and fluid-restriction controls stay in Symptoms & daily assessment.
- Two rationale fields moved to where they apply and show only when needed:
  - Plan: "Hospital assessment indicated — reason for not referring" appears when findings need hospital assessment and the plan is not ED referral.
  - Intervention: "Indication for IM Voltaren / IV hydrocortisone" appears when either is ticked.
- **"Additional warning sign / clinical rationale" removed.** "Warning signs confirmed on clinical assessment" now counts the findings already recorded (red boxes, liver examination, FBC trend). If none is recorded, the form asks for the specific sign to be ticked.

## v18.243.0 (9 Nov 2026)
- **Saved drafts panel tidied.** Optional sections now sit at the top as one compact block with On / Off pills. Saved drafts sit below as a single list: label on line 1, then form type, time and hours left on line 2, with a small ✕ to delete. The yellow storage box became one grey line, and "Delete all drafts" is a small link shown only when drafts exist.
- **Maximum 10 drafts per device.** The counter shows "n / 10". When full, saving a new draft is blocked with a clear message; updating an open draft still works. Drafts already stored above 10 are never trimmed silently and expire after 24 h as before.
- **Reset now starts a new draft.** After a completed Reset / Clear, the next save creates a new draft instead of overwriting the draft that was open. A cancelled reset changes nothing.

## v18.244.0 (9 Nov 2026)
- Saved drafts are listed oldest at the top and newest at the bottom, ordered by when each draft was first saved, so updating a draft does not move it.

## v18.245.0 (9 Nov 2026)
- Adult Abdominal pain box (new case and follow-up): the "Intense abdominal pain or tenderness" tick box now sits directly under the yes/no answer, above the site list. It carries a short note: "Abdominal pain alone is not a warning sign. Only intense abdominal pain or tenderness counts." No rule change.

## v18.246.0 (9 Nov 2026)
- Removed the referral check box at the top of both dengue forms (new case and follow-up). That box showed "Referral check active", "Clinical reassessment required" and Group A/B1/B2/C, with a "Set plan to Refer ED" button and pop-up. The top notice line is kept. Hospital-referral logic is unchanged: for adults, the Plan still asks for a reason when findings need hospital assessment and the plan is not ED referral.
