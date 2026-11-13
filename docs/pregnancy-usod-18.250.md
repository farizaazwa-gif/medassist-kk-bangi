# Pregnancy Date Calculator — LMP block and USOD dating scan (v18.250)

Requested by Dr Fariza (13 Nov 2026): show the LMP in the result box before the EDD so the
result can be pasted straight into notes, and add an Unsure of Date (USOD) pathway from the
dating scan.

## Output (copy-ready, also via the "Copy result" button)

```
LMP: 01/11/2026
POA: 1 week 5 days
EDD: 08/08/2027

USOD
Scan 20/10/2026: c/w 8 weeks 2 days
POG: 11 weeks 5 days
REDD: 30/05/2027
```

Only the blocks with inputs are shown: LMP only, USOD scan only, or both.

## Rules

| Item | Rule |
| --- | --- |
| EDD | LMP + 280 days (Naegele's rule) — unchanged from earlier versions |
| POA | Assessment date − LMP, shown as "X weeks Y days" |
| REDD | Scan date + (280 − GA at scan in days) |
| POG | GA at scan + (assessment date − scan date), shown as "X weeks Y days" |

Input checks: GA at scan 4–42 weeks, 0–6 days (blank days = 0); assessment date cannot be
before the LMP or the scan date.

The calculator does not decide whether LMP or scan dating should be used; that remains the
clinician's decision.

## Code

- `medassist-pregnancy-dates-script` (pure functions, `window.MedAssistPregnancyDates`)
- Pregnancy handler in the main page script: renders both blocks, re-calculates on input change
  after the first Calculate so the copied text is never stale.
- Tests: `tests/clinical-calculators.test.js` (normal, boundary and invalid cases).

## v18.251

Gestational age (POA, POG, GA at scan) changed back to "X weeks Y days" wording at the user's request, with correct singular/plural (1 week, 1 day).
