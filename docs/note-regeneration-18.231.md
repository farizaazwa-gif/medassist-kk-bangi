# Dengue note generation — 18.231.0

Requested behaviour: Generate is always available, including incomplete forms,
and regenerating a note retains additions and edits typed into the output.

Both dengue workflows now generate notes and referral letters without the
diagnosis-review, custom-plan or antimicrobial-completeness gates. Existing
clinical calculation and classification rules remain in place. An incomplete
diagnosis is shown as pending; an invalid or non-prescribable IV calculation is
documented as a pending prescription, never as an infusion already started.

`assets/note-edits.js` merges the previous automatic text, current editable text
and new automatic text. Manual additions, replacements and deletions are kept;
unmodified sections receive current form values. When the same lines change
both manually and through the form, the manual wording takes precedence and
the output helper requests a review. Distinct additions at the same position
are both retained; identical additions are not duplicated.

Notes and referrals have independent baselines. Changing an input or switching
plans no longer deletes an edited referral. Reset and opening another saved
draft clear the relevant baselines to prevent content crossing between patients.
Clearing the entire output explicitly starts a fresh generation. Baselines are
in page memory only; this change does not store generated text in browser
storage or change the existing saved-draft policy.

Validation includes merge behaviour tests, full clinical regression checks,
and browser workflows for every plan option, incomplete adult/paediatric forms,
manual edits at multiple positions, repeated generation, overlap notices,
editable referrals, clipboard content, mobile layout and reset/draft isolation.
The diagnosis browser regression now checks generation of incomplete notes
while retaining the reviewed diagnosis classification tests.
