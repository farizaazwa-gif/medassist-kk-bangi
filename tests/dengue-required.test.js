const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../assets/dengue-required.js");
const { INDEX_HTML: html } = require("./helpers/source-tools.js");

const complete = (prefix, adult, extra = {}) => ({
  prefix, adult,
  weight: "20", dxType: "Probable dengue fever", dxOther: "",
  day: "4", phase: "febrile phase", warningChoice: "without", effectiveWarnings: [],
  warningTarget: `${prefix}DxWarning`,
  haemo: "haemodynamically stable", comorbidStatus: "none", comorbidDetail: "", topComorbid: "",
  ...extra
});
const fields = input => R.evaluate(input).map(item => item.field);

test("complete paediatric and adult forms pass for both modules", () => {
  for (const prefix of ["cl", "dfu"]) for (const adult of [false, true]) {
    assert.deepEqual(R.evaluate(complete(prefix, adult)), [], `${prefix} adult=${adult}`);
  }
});

test("empty form lists weight and all six diagnosis items in order", () => {
  const empty = { prefix: "cl", adult: false, dxType: "Dengue fever", weight: "", day: "", phase: "", warningChoice: "", haemo: "", comorbidStatus: "" };
  assert.deepEqual(R.evaluate(empty).map(i => i.label), [
    "Weight (kg)", "2. Day of illness", "3. Phase", "4. Warning signs — with or without", "5. Shock status", "6. Comorbidities — with or without"
  ]);
  assert.deepEqual(fields({ ...empty, prefix: "dfu" }), ["dfuWeight", "dfuDayIllness", "dfuPhase", "dfuDxWarning", "dfuHaemo", "dfuDxComorbidStatus"]);
});

test("item 1: dengue fever / probable dengue fever on both forms; other diagnosis text", () => {
  for (const adult of [false, true]) {
    assert.deepEqual(fields(complete("cl", adult, { dxType: "" })), ["clDxType"]);
    assert.deepEqual(fields(complete("dfu", adult, { dxType: "" })), ["dfuDxType"]);
    assert.deepEqual(fields(complete("cl", adult, { dxType: "Dengue fever" })), []);
    assert.deepEqual(fields(complete("dfu", adult, { dxType: "Dengue fever" })), []);
  }
  // Blank item 1 still checks the remaining dengue items.
  assert.deepEqual(fields(complete("cl", true, { dxType: "", phase: "" })), ["clDxType", "clPhase"]);
  assert.deepEqual(fields(complete("cl", false, { dxType: "Other", dxOther: " " })), ["clDxOther"]);
  // Non-dengue diagnosis: dengue items no longer apply, weight still does.
  assert.deepEqual(fields(complete("cl", false, { dxType: "Viral fever", phase: "", haemo: "", weight: "" })), ["clWeight"]);
});

test("item 2: day of illness must be a positive whole number", () => {
  for (const day of ["", "0", "-1", "2.5", "abc"]) assert.deepEqual(fields(complete("cl", false, { day })), ["clDxDay"], day);
  assert.deepEqual(fields(complete("cl", false, { day: "1" })), []);
});

test("item 4: 'with' needs a recorded sign; adult clinician confirmation needs the specific sign", () => {
  assert.deepEqual(fields(complete("cl", false, { warningChoice: "with", warningTarget: "clWarningSigns" })), ["clWarningSigns"]);
  assert.deepEqual(fields(complete("cl", false, { warningChoice: "with", effectiveWarnings: ["persistent vomiting"] })), []);
  // v18.242: no free-text rationale; the clinician ticks the specific sign in the warning panel.
  assert.deepEqual(fields(complete("cl", true, { warningChoice: "with", effectiveWarnings: [R.GENERIC_CONFIRMED], warningTarget: "clCpgWarningPanel" })), ["clCpgWarningPanel"]);
  assert.deepEqual(fields(complete("cl", true, { warningChoice: "with", effectiveWarnings: ["liver enlargement >2 cm"] })), []);
  assert.deepEqual(fields(complete("dfu", false, { warningChoice: "without", effectiveWarnings: ["bleeding tendency: gum bleeding"] })), ["dfuDxWarning"]);
});

test("item 6: comorbidity status and list; top-level comorbidity counts for the new case", () => {
  assert.deepEqual(fields(complete("cl", false, { comorbidStatus: "present" })), ["clDxComorbid"]);
  assert.deepEqual(fields(complete("cl", false, { comorbidStatus: "present", comorbidDetail: "nil" })), ["clDxComorbid"]);
  assert.deepEqual(fields(complete("cl", false, { comorbidStatus: "", topComorbid: "DM, HPT" })), []);
  assert.deepEqual(fields(complete("dfu", false, { comorbidStatus: "present", comorbidDetail: "Asthma" })), []);
});

test("adult severe organ involvement needs documented details", () => {
  assert.deepEqual(fields(complete("cl", true, { severeOrgan: true })), ["clOrganFailureDetails"]);
  assert.deepEqual(fields(complete("cl", true, { severeOrgan: true, organDetails: "ALT 1200, confusion" })), []);
});

test("weight must be positive", () => {
  for (const weight of ["", "0", "-3", "abc"]) assert.deepEqual(fields(complete("dfu", false, { weight })), ["dfuWeight"], weight);
});

test("form markup: blank defaults, required markers and warning-sign selectors", () => {
  for (const id of ["clDxType", "dfuDxType", "clPhase", "dfuPhase", "clHaemo", "dfuHaemo", "clDxComorbidStatus", "dfuDxComorbidStatus", "clDxWarning", "dfuDxWarning"]) {
    const start = html.indexOf(`<select id="${id}">`);
    assert.ok(start > 0, `${id} must exist`);
    assert.match(html.slice(start, start + 120), /<select id="[a-zA-Z]+">\s*<option selected="" value="">— Select —<\/option>/, `${id} must default to blank`);
  }
  for (const label of ["1. Diagnosis", "2. Day of illness", "3. Phase", "4. Warning signs", "5. Shock status", "6. Comorbidities"]) {
    assert.ok(html.split(label).length - 1 >= 2, `${label} must label both modules`);
  }
  assert.match(html, /<script src="assets\/dengue-required\.js\?v=18\.242\.0"><\/script>/);
  // v18.242: probable option present; Assessment review and the free-text warning rationale are gone.
  assert.match(html, /<option value="Probable dengue fever">Probable dengue fever<\/option>/);
  for (const gone of ["CpgReview\"", "CpgDxCertainty", "CpgDxEvidence", "CpgWarningDetail", "CpgVaccine", "<strong>Assessment review</strong>"]) assert.ok(!html.includes(gone), `${gone} must be removed`);
  for (const kept of ["clCpgFluidRestriction", "dfuCpgFluidRestriction", "clCpgUrineRecord", "dfuCpgUrineRecord", "clCpgDispositionReason", "dfuCpgDispositionReason", "clCpgSteroidIndication", "dfuCpgSteroidIndication"]) assert.ok(html.includes(`id="${kept}"`), `${kept} must remain`);
  assert.doesNotMatch(html, /TPC-OHCIS/);
});
