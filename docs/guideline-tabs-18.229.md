# Guideline tab retention — 18.229.0

The adult dengue reference button opened a new tab with `noopener`, then
interpreted the returned `null` as a failed opening and navigated the current
MedAssist tab to the same reference. A successful `window.open` with `noopener`
can return `null`; it is not a reliable popup-blocking check.

The reference is now a native link with `target="_blank"` and
`rel="noopener noreferrer"`. The JavaScript opening and same-tab fallback were
removed. The URL, label and existing reference styling are retained. Clinical
calculations, classifications and generated wording are unchanged.

## Verification

- Before the fix, the browser regression reproduced the original-tab navigation
  to `docs/dengue-cpg4-reference.html` and failed its URL-preservation assertion.
- `scripts/qa-guideline-tabs.cjs` exercises visible local CPG and IV guide links
  in both dengue forms on desktop and narrow mobile viewports, including keyboard
  activation. It checks exactly one new guideline tab, a null opener, unchanged
  original URL/session, no original-tab navigation, and unchanged inputs and
  generated/editable outputs across both forms, using synthetic data only.
- Run the navigation regression with Playwright and an installed Chromium:
  `MEDASSIST_BROWSER=/path/to/chromium node scripts/qa-guideline-tabs.cjs`.
- Local results: all 16 guideline openings preserved both forms and opened
  exactly one separate tab; 100/100 unit checks and the full clerking browser
  regression passed, with no browser runtime errors.
- Release gates: `npm test`, `node --check scripts/qa-guideline-tabs.cjs`, and
  `scripts/qa-clerking.cjs` for critical workflow, editable-output, copy and
  isolated-reset checks; GitHub Clinical regression checks before merge and
  byte-for-byte live asset verification after Pages deployment.
