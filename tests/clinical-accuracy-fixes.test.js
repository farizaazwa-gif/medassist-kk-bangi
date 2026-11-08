const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const P = require("../assets/paeds-dengue-weight.js");
const {
  ROOT,
  INDEX_HTML: html,
  runScriptPrefix,
  createFieldDocument
} = require("./helpers/source-tools.js");

function whoTables() {
  const sandbox = { window: {} };
  vm.runInNewContext(
    fs.readFileSync(path.join(ROOT, "assets", "who-growth-reference.js"), "utf8"),
    sandbox
  );
  return sandbox.window.MedAssistWhoGrowthLms.tables;
}
const tables = whoTables();

/* ---------- Paediatric dengue weight: CPG Dengue in Children 2020 p19 & Appendix 7 ---------- */

test("WHO BMI-for-age z-score is 0 at the median and uses WHO overweight/obesity cut-offs", () => {
  const lms = P.lmsAt(tables, 96, "Male");
  assert.ok(lms, "WHO 5–19 BMI LMS row for 96 months must exist");
  assert.ok(Math.abs(P.zScore(lms, lms.M)) < 1e-9);

  const bmiAt = (z, l) => l.M * Math.pow(1 + l.L * l.S * z, 1 / l.L);
  const height = 128;
  const weightForBmi = bmi => bmi * Math.pow(height / 100, 2);
  // 5–19 years: overweight >+1 SD, obesity >+2 SD.
  assert.equal(P.screen({ weight: weightForBmi(bmiAt(1.5, lms)), height, sex: "Male", age: "96", ageUnit: "months", tables }).status, "overweight");
  assert.equal(P.screen({ weight: weightForBmi(bmiAt(2.5, lms)), height, sex: "Male", age: "96", ageUnit: "months", tables }).status, "obese");
  assert.equal(P.screen({ weight: weightForBmi(bmiAt(0.5, lms)), height, sex: "Male", age: "96", ageUnit: "months", tables }).status, "not overweight");

  // Under 5 years: overweight >+2 SD, obesity >+3 SD.
  const u5 = P.lmsAt(tables, 36, "Female");
  const h5 = 95;
  const w5 = z => bmiAt(z, u5) * Math.pow(h5 / 100, 2);
  assert.equal(P.screen({ weight: w5(1.5), height: h5, sex: "Female", age: "36", ageUnit: "months", tables }).status, "not overweight");
  assert.equal(P.screen({ weight: w5(2.5), height: h5, sex: "Female", age: "36", ageUnit: "months", tables }).status, "overweight");
});

test("overweight/obese child cannot be calculated on actual weight; paediatric IBW is required", () => {
  const screenResult = P.screen({ weight: 40, height: 128, sex: "Male", age: "8", ageUnit: "years", tables });
  assert.equal(screenResult.status, "obese");
  const actual = P.select({ actual: 40, basis: "actual", screenResult });
  assert.equal(actual.valid, false);
  assert.match(actual.error, /ideal body weight/);
  assert.match(actual.error, /Appendix 7/);

  const ibw = P.select({ actual: 40, basis: "pibw", ibw: 26, screenResult });
  assert.equal(ibw.valid, true);
  assert.equal(ibw.selected, 26);

  assert.equal(P.select({ actual: 40, basis: "pibw", ibw: "", screenResult }).valid, false);
  assert.equal(P.select({ actual: 40, basis: "pibw", ibw: 41, screenResult }).valid, false);
});

test("normal-weight child uses actual weight; incomplete data warns instead of guessing", () => {
  const normal = P.screen({ weight: 25, height: 128, sex: "Male", age: "8", ageUnit: "years", tables });
  assert.equal(normal.status, "not overweight");
  const ok = P.select({ actual: 25, basis: "actual", screenResult: normal });
  assert.equal(ok.valid, true);
  assert.equal(ok.selected, 25);
  assert.equal(ok.warning, "");

  const unknown = P.screen({ weight: 25, height: "", sex: "Male", age: "8", ageUnit: "years", tables });
  assert.equal(unknown.status, "unknown");
  const warned = P.select({ actual: 25, basis: "actual", screenResult: unknown });
  assert.equal(warned.valid, true);
  assert.match(warned.warning, /height not entered/);
  assert.equal(P.select({ actual: "", basis: "actual", screenResult: unknown }).valid, false);
});

test("paediatric IBW is never auto-derived from the adult Devine formula", () => {
  assert.doesNotMatch(html, /2\.3\*\((h|height)\/2\.54-60\)/);
});

/* ---------- Target BP: CPG Management of Hypertension 2018 ---------- */

function targetBpFor(fields) {
  const { document } = createFieldDocument(fields);
  const { exports } = runScriptPrefix(
    "v18196HypertensionScript",
    "function anyPositive",
    ["targetBp"],
    { document }
  );
  return exports.targetBp(NaN);
}

test("target BP follows CPG HPT 2018 instead of a blanket <130/80", () => {
  assert.equal(targetBpFor({ htnAge: "50", htnDm: "no", htnCkd: "no", htnCva: "no" }), "<140/90 mmHg");
  assert.match(targetBpFor({ htnAge: "50", htnDm: "yes", htnCkd: "no", htnCva: "no" }), /^<140\/80 mmHg \(DM: consider <130\/80 if younger\)/);
  assert.match(targetBpFor({ htnAge: "55", htnDm: "no", htnCkd: "yes", htnCva: "no" }), /proteinuria >1 g\/day: <130\/80/);
  assert.match(targetBpFor({ htnAge: "60", htnDm: "no", htnCkd: "no", htnCva: "yes" }), /lacunar stroke: <130\/80/);
  assert.match(targetBpFor({ htnAge: "70", htnDm: "no", htnCkd: "no", htnCva: "no" }), /^<140\/90 mmHg \(age 65–79: consider SBP <130 if fit\)/);
  assert.equal(targetBpFor({ htnAge: "82", htnDm: "yes", htnCkd: "no", htnCva: "no" }), "<150/90 mmHg (age ≥80; individualise)");
  assert.equal(targetBpFor({ htnAge: "", htnDm: "no" }), "Enter age / risk data");
});

/* ---------- Paediatric IV hydrocortisone cap ---------- */

test("paediatric IV hydrocortisone is 4 mg/kg capped at 100 mg/dose", () => {
  const start = html.indexOf("const PAEDS_HYDROCORTISONE_MAX_MG");
  const end = html.indexOf("window.paedsHydrocortisoneDose=", start);
  assert.ok(start > 0 && end > start);
  const sandbox = {};
  vm.runInNewContext(`${html.slice(start, end)};this.dose=paedsHydrocortisoneDose;this.basis=paedsHydrocortisoneBasis;`, sandbox);
  assert.equal(sandbox.dose(10), 40);
  assert.equal(sandbox.dose(25), 100);
  assert.equal(sandbox.dose(40), 100);
  assert.equal(sandbox.dose(0), null);
  assert.equal(sandbox.dose(""), null);
  assert.match(sandbox.basis(40), /capped at maximum 100 mg\/dose/);
  assert.doesNotMatch(sandbox.basis(20), /capped/);
  assert.doesNotMatch(html, /return weight\*4;/);
});

/* ---------- RME 1: VTE factors and GDM age rule ---------- */

test("VTE checklist includes RCOG factors previously missing", () => {
  ["rmeVteAgeScore", "rmeVteParityScore", "rmeVteVaricose", "rmeVteMultiple", "rmeVtePreterm"].forEach(id => {
    assert.match(html, new RegExp(`id="${id}"`), `${id} must exist`);
  });
  assert.match(html, /vteAge>35\?1:0/);
  assert.match(html, /vtePara>=3\?1:0/);
  assert.match(html, /auto-multiple/);
});

test("age ≥25 alone is not treated as an early-OGTT risk factor (CPG Diabetes in Pregnancy 2017)", () => {
  const start = html.indexOf("function ogttRisk(){");
  const end = html.indexOf("function pretermRisk(){", start);
  assert.ok(start > 0 && end > start);
  assert.doesNotMatch(html.slice(start, end), /auto\.push\("age/);
});
