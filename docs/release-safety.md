# MedAssist release safety

This checklist protects clinical workflows while the single-file application is gradually modularised.

## Stable recovery point

- Stable backup branch: `backup/stable-v18.214.0`
- Stable commit: `448c34579b94844fc7c1d401b2751e0afe21e7da`
- Never force-push or reuse the stable backup branch for new work.

## Required checks before merge

1. Work on a feature branch, never directly on `main`.
2. Run `node --check` for every edited JavaScript asset.
3. Run `npm test` and require a completely green result.
4. Confirm the critical workflow contracts for Dengue New Case, Dengue Follow-up, DM, HPT, NNJ, RME1, IUCD, ADHD and Autism.
5. Confirm generated clinical notes and referral letters remain editable.
6. Confirm reset affects only the active clerking.
7. Smoke-test the changed workflow on a narrow mobile viewport and a desktop viewport.
8. Merge only after the GitHub Clinical regression checks workflow passes.
9. Verify the live GitHub Pages asset after deployment.

## Clinical-rule changes

- Record the guideline name, edition/year and the exact rule being changed.
- Add or update a behaviour test with normal, boundary and abnormal cases.
- Do not silently change a formula, referral trigger, dose, risk threshold or generated-note phrase.
- Keep clinician override and editable output wherever the current workflow provides them.

## Privacy invariants

- Do not add analytics or external logging that can receive patient-entered text.
- Keep temporary drafts local, privacy-filtered and time-limited.
- Do not persist direct identifiers in browser storage.

## Rollback

If a live release causes a clinical or workflow regression, stop further feature work, identify the last known-good commit, and restore `main` through a reviewed rollback PR. The stable backup branch is the reference point for the V18.214 baseline.
