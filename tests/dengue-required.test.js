const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../assets/dengue-required.js");
const { INDEX_HTML: html } = require("./helpers/source-tools.js");

const complete = (prefix, adult, extra = {}) => ({
  prefix, adult,
  weight: "20", dxType: "Dengue fever", dxOther: "",
  certainty: adult ? "suspected" : "", evidence: "", reviewed: adult,
  day: "4", phase: "febrile phase", warningChoice: "without", effectiveWarnings: [],
  warningTarget: `${prefix}DxWarning`, warningDetail: "",
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

test("item 1: diagnosis type, other text, and adult suspected/confirmed with evidence", () => {
  assert.deepEqual(fields(complete("cl", false, { dxType: "" })), ["clDxType"]);
  assert.deepEqual(fields(complete("cl", false, { dxType: "Other", dxOther: " " })), ["clDxOther"]);
  // Non-dengue diagnosis: dengue items no longer apply, weight still does.
  assert.deepEqual(fields(complete("cl", false, { dxType: "Viral fever", phase: "", haemo: "", weight: "" })), ["clWeight"]);
  assert.deepEqual(fields(complete("cl", true, { certainty: "" })), ["clCpgDxCertainty"]);
  assert.deepEqual(fields(complete("dfu", true, { certainty: "confirmed" })), ["dfuCpgDxEvidence"]);
  assert.deepEqual(fields(complete("dfu", true, { certainty: "confirmed", evidence: "NS1 +ve 2/11" })), []);
  assert.deepEqual(fields(complete("cl", true, { reviewed: false })), ["clCpgDxReviewed"]);
});

test("item 2: day of illness must be a positive whole number", () => {
  for (const day of ["", "0", "-1", "2.5", "abc"]) assert.deepEqual(fields(complete("cl", false, { day })), ["clDxDay"], day);
  assert.deepEqual(fields(complete("cl", false, { day: "1" })), []);
});

test("item 4: 'with' needs a recorded sign; adult clinician confirmation needs the specific sign", () => {
  assert.deepEqual(fields(complete("cl", false, { warningChoice: "with", warningTarget: "clWarningSigns" })), ["clWarningSigns"]);
  assert.deepEqual(fields(complete("cl", false, { warningChoice: "with", effectiveWarnings: ["persistent vomiting"] })), []);
  assert.deepEqual(fields(complete("cl", true, { warningChoice: "with", effectiveWarnings: [R.GENERIC_CONFIRMED] })), ["clCpgWarningDetail"]);
  assert.deepEqual(fields(complete("cl", true, { warningChoice: "with", effectiveWarnings: [R.GENERIC_CONFIRMED], warningDetail: "liver 3 cm" })), []);
  assert.deepEqual(fields(complete("dfu", false, { warningChoice: "without", effectiveWarnings: ["bleeding tendency: gum bleeding"] })), ["dfuDxWarning"]);
});

test("item 6: comorbidity status and list; top-level comorbidity counts for the new case", () => {
  assert.deepEqual(fields(complete("cl", false, { comorbidStatus: "present" })), ["clDxComorbid"]);
  assert.deepEqual(fields(complete("cl", false, { comorbidStatus: "present", comorbidDetail: "nil" })), ["clDxComorbid"]);
  assert.deepEqual(fields(complete("cl", false, { comorbidStatus: "", topComorbid: "DM, HPT" })), []);
  assert.deepEqual(fields(complete("dfu", false, { comorbidStatus: "present", comorbidDetail: "Asthma" })), []);
});

test("weight must be positive", () => {
  for (const weight of ["", "0", "-3", "abc"]) assert.deepEqual(fields(complete("dfu", false, { weight })), ["dfuWeight"], weight);
});

test("form markup: blank defaults, required markers and warning-sign selectors", () => {
  for (const id of ["clPhase", "dfuPhase", "clHaemo", "dfuHaemo", "clDxComorbidStatus", "dfuDxComorbidStatus", "clDxWarning", "dfuDxWarning"]) {
    const start = html.indexOf(`<select id="${id}">`);
    assert.ok(start > 0, `${id} must exist`);
    assert.match(html.slice(start, start + 120), /<select id="[a-zA-Z]+">\s*<option selected="" value="">— Select —<\/option>/, `${id} must default to blank`);
  }
  for (const label of ["2. Day of illness", "3. Phase", "4. Warning signs", "5. Shock status", "6. Comorbidities"]) {
    assert.ok(html.split(label).length - 1 >= 2, `${label} must label both modules`);
  }
  assert.match(html, /<script src="assets\/dengue-required\.js\?v=18\.235\.0"><\/script>/);
  assert.doesNotMatch(html, /TPC-OHCIS/);
});
