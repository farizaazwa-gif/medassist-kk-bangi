# MedAssist completion task: safety fixes + HPT CKD workflow + Calendar 2027

Work from this branch only. Do not merge automatically. Preserve all existing clinical thresholds, IDs, styling systems, navigation behavior, note/referral behavior and unrelated modules unless explicitly changed below.

## A. Re-implement the safety fixes cleanly from fresh `main`

### Pregnancy dating / RME1
- Create/use a shared date-only helper so pregnancy calculations are stable regardless of browser/host timezone.
- Standalone pregnancy calculator and RME1 must use date-only calendar arithmetic.
- EDD = LNMP + 280 days.
- POG must use whole calendar-day differences.
- Default assessment date must use the Malaysia calendar date (`Asia/Kuala_Lumpur`).
- Reject assessment dates before LNMP and clear gestation outputs with a clear validation message.
- Preserve the existing manual EDD override condition/behavior.
- Ensure only one effective RME1 `initDate()` implementation remains and no later local-time declaration overrides it.

### ADHD/autism persistence
- Restore persistence without modifying `Storage.prototype` or globally patching browser APIs.
- Autosave/draft writes must be verified by read-back before success is reported.
- Preserve existing draft save/rename/delete UX and unrelated persistence behavior.

### Generated output freshness
- Add valid standalone stale/dirty output handling for DM, HPT, RME1 note/referral, NNJ note/referral, IUCD, ADHD, and autism.
- Form changes mark output stale.
- Explicit Generate clears stale state.
- Copy regenerates first only when stale.
- Manual edits to generated text remain intact while form data is unchanged.
- Never insert a `<script>` tag inside an already-active `<script>` block.

## B. HPT CKD stage / ESRF / haemodialysis workflow

Enhance the existing HPT clerking CKD field.

1. Keep `CKD: No / Yes`.
2. If CKD = No:
   - Hide CKD stage / ESRF / haemodialysis controls.
   - Do not generate stage/ESRF/HD wording.
3. If CKD = Yes:
   - Reveal `CKD stage` with: G1, G2, G3a, G3b, G4, G5 — ESRF.
4. Use existing CKD-EPI 2021 eGFR to auto-suggest the corresponding stage when age/sex/creatinine are available.
5. Allow clinician manual confirmation/override. Once manually selected, do not overwrite that documented stage on later recalculation unless reset/changed by clinician.
6. If stage = G5 — ESRF:
   - Reveal `On haemodialysis: No / Yes`.
   - If Yes, reveal schedule:
     - `1,3,5 (Mon/Wed/Fri)`
     - `2,4,6 (Tue/Thu/Sat)`
7. HPT generated note examples:
   - `CKD G2`
   - `CKD G3b`
   - `CKD G5 (ESRF), not on HD`
   - `CKD G5 (ESRF), on HD (1,3,5)`
   Avoid duplicate CKD wording if CKD is already represented in the comorbidity section.
8. Keep the existing RESULTS eGFR line, e.g. `eGFR (CKD-EPI 2021): ... (G3b)`.
9. Reset must clear and hide conditional CKD/ESRF/HD controls.
10. HPT stale/dirty generated-output handling must respond to changes in these new fields.
11. Do not change BP categories, FRS formula, BP target logic, referral thresholds, medication logic, lab parsing, or unrelated HPT behavior.

## C. Add a native interactive `Calendar 2027` module

Do not use the supplied raster calendar image as the webpage itself and do not directly edit that image. Recreate the schedule as a native HTML/CSS/JS calendar so the resulting website page has no `siti.co` watermark and remains editable/interactive.

### Visual direction
- Soft watercolor / pastel / garden aesthetic inspired by the supplied design.
- Header: `CALENDAR 2027` or `Calendar 2027`.
- 12 month mini-calendars in a clean responsive grid.
- Purple marker = Public Holiday.
- Pink marker = Blocked NCD.
- Add the note: `Ramadhan (no fasting blood ix): 8/2/27 - 9/3/27`.
- Use CSS gradients/shapes/decorative effects rather than copying any watermark/branding.

### Calendar data from the supplied design
- January: Public Holiday 1,22; Blocked NCD 4,25. Notes: 1 New Year; 22 Thaipusam.
- February: Public Holiday 8,24; Blocked NCD 9. Notes: 8 Cuti peristiwa CNY; 24 Nuzul Al-Quran.
- March: Public Holiday 10,11; Blocked NCD 5,8,9,12,15,16. Note: 10–11 Raya Eid.
- April: no marked dates shown.
- May: Public Holiday 17,20; Blocked NCD 13,14,18,19. Notes: 17 Raya Haji; 20 Vesak.
- June: Public Holiday 7,8; Blocked NCD 9. Notes: 7 Birthday Agong; 8 Awal Muharram.
- July: no marked dates shown.
- August: Public Holiday 31; Blocked NCD 16,17. Notes: 16 Maulidurrasul; 31 Merdeka!.
- September: Public Holiday 16. Note: 16 Hari Malaysia.
- October: Public Holiday 28. Note: 28 Deepavali.
- November: no marked dates shown.
- December: no marked dates shown.

### Calendar interactions
- Add a dashboard/module entry named `Calendar 2027` and preserve existing sidebar/dashboard navigation.
- Clicking a month should focus/expand that month.
- Clicking a marked date should show event/category details in an accessible popover/panel/modal.
- Add filter/toggle controls for Public Holiday and Blocked NCD; include the Ramadan note visibly and optionally as a toggle.
- Provide a compact event summary below the calendar.
- Responsive on desktop/mobile.
- Print-friendly if practical.
- Fixed-year planning calendar: no dependency on current year/date for layout generation.

## D. Safety and regression constraints
- No duplicate IDs.
- No nested active `<script>` blocks.
- No global browser API monkey-patching.
- Keep all existing MedAssist modules initializing and functioning.
- Do not alter unrelated clinical thresholds/logic.
- Keep generated clinical notes/referrals editable.

## E. Required tests before finishing
- Extract every inline script and run `node --check` on all of them.
- HTML duplicate-ID audit: zero duplicate IDs.
- Nested-script audit: none.
- Pregnancy date tests under at least UTC, Asia/Kuala_Lumpur and one non-Malaysia timezone.
- Assessment-before-LNMP rejection test.
- HPT CKD workflow tests: CKD No hidden; CKD Yes stage shown; eGFR suggestion; manual override persists; G5 ESRF; HD Yes schedule; note output; reset.
- Calendar checks: 12 months render; marked dates match the schedule above; click interactions work at code level; filters work; responsive CSS present.
- `git diff --check` must pass.
- Working tree clean at end.

## F. Final delivery
- Implement the code changes in this branch.
- Remove this `CODEX_TASK_COMPLETE_MEDASSIST.md` task file before final commit so it does not ship to production.
- Commit the implementation.
- Update this pull request with the fixes/features.
- Do not merge automatically.
