const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const { INDEX_HTML, ROOT, inlineScript } = require("./helpers/source-tools");

function loadGrowthData() {
  const source = fs.readFileSync(path.join(ROOT, "assets", "who-growth-reference.js"), "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { filename: "who-growth-reference.js" });
  return sandbox.window.MedAssistWhoGrowthLms;
}

function loadGrowthEngine(data) {
  const source = inlineScript("medassist-neuro-enhancements-v2-script");
  const start = source.indexOf("  const WHO_GROWTH_REFERENCES = {");
  const end = source.indexOf("  function createGrowthPanel", start);
  assert.ok(start >= 0 && end > start, "growth engine block must remain extractable");
  const body = source.slice(start, end);
  const sandbox = {
    window: { MedAssistWhoGrowthLms: data },
    runtimeState: { adhd: { growth: {} }, autism: { growth: {} } },
    value: () => "",
    module: { exports: {} }
  };
  vm.runInNewContext(
    `${body}\nmodule.exports = { WHO_GROWTH_REFERENCES, whoCompletedMonth, whoReferenceForAge, whoTable, whoLmsAt, whoValueAtZ, whoZScore, whoClassification, whoChartSvg };`,
    sandbox,
    { filename: "growth-engine-contract.js" }
  );
  return sandbox.module.exports;
}

test("official WHO LMS datasets cover only their published completed-month ranges", () => {
  const data = loadGrowthData();
  assert.equal(data.version, "WHO-2006-2007-LMS-2026-08-24");

  for (const sex of ["Male", "Female"]) {
    for (const indicator of ["weight", "height", "bmi", "head"]) {
      const [startMonth, rows] = data.tables.under5[indicator][sex];
      assert.equal(startMonth, 0);
      assert.equal(rows.length, 61, `${indicator} ${sex} must cover months 0–60`);
    }

    const [weightStart, weightRows] = data.tables.fiveTo19.weight[sex];
    assert.equal(weightStart, 61);
    assert.equal(weightRows.length, 60, `weight ${sex} must cover months 61–120`);

    for (const indicator of ["height", "bmi"]) {
      const [startMonth, rows] = data.tables.fiveTo19[indicator][sex];
      assert.equal(startMonth, 61);
      assert.equal(rows.length, 168, `${indicator} ${sex} must cover months 61–228`);
    }
  }
});

test("WHO 2006/2007 boundary and LMS z-score calculations remain stable", () => {
  const data = loadGrowthData();
  const engine = loadGrowthEngine(data);

  assert.equal(engine.whoReferenceForAge(60.999).key, "under5");
  assert.equal(engine.whoReferenceForAge(61).key, "fiveTo19");
  assert.equal(engine.whoReferenceForAge(228.999).key, "fiveTo19");
  assert.equal(engine.whoReferenceForAge(229), null);

  const birthWeightMale = engine.whoLmsAt(0, "weight", "Male");
  assert.equal(birthWeightMale.M, 3.3464);
  assert.ok(Math.abs(engine.whoZScore(birthWeightMale, birthWeightMale.M)) < 1e-12);

  const month60WeightMale = engine.whoLmsAt(60, "weight", "Male");
  const month61WeightMale = engine.whoLmsAt(61, "weight", "Male");
  assert.equal(month60WeightMale.M, 18.3366);
  assert.equal(month61WeightMale.M, 18.5057);
  assert.equal(engine.whoLmsAt(121, "weight", "Male"), null);
  assert.ok(engine.whoLmsAt(228, "height", "Female"));
  assert.ok(engine.whoLmsAt(228, "bmi", "Female"));

  const plusThree = engine.whoValueAtZ(month61WeightMale, 3);
  const plusTwo = engine.whoValueAtZ(month61WeightMale, 2);
  const extendedMeasurement = plusThree + (plusThree - plusTwo) / 2;
  assert.ok(Math.abs(engine.whoZScore(month61WeightMale, extendedMeasurement) - 3.5) < 1e-10);
});

test("growth panel uses local calculated SVGs and preserves WHO indicator limits", () => {
  const dataScriptIndex = INDEX_HTML.indexOf('<script src="assets/who-growth-reference.js"></script>');
  const enhancementIndex = INDEX_HTML.indexOf('<script id="medassist-neuro-enhancements-v2-script">');
  assert.ok(dataScriptIndex >= 0 && dataScriptIndex < enhancementIndex);
  assert.doesNotMatch(INDEX_HTML, /data-who-chart-frame|who-growth-chart-star|\.plot\s*=|xStart\s*:/);
  assert.match(INDEX_HTML, /weight:\s*\{ ageMin: 61, ageMax: 120/);
  assert.match(INDEX_HTML, /head:\s*\{ ageMin: 0, ageMax: 60/);
  assert.match(INDEX_HTML, /data-who-chart-type=\"head\"/);
  assert.match(INDEX_HTML, /Calculated locally from official WHO monthly LMS tables/);
});

test("native WHO chart renders seven finite z-score curves and a patient point", () => {
  const engine = loadGrowthEngine(loadGrowthData());
  const config = engine.WHO_GROWTH_REFERENCES.fiveTo19.charts.bmi;
  const table = engine.whoTable("fiveTo19", "bmi", "Male");
  const lms = engine.whoLmsAt(108, "bmi", "Male");
  const measurement = 18.5;
  const z = engine.whoZScore(lms, measurement);
  const svg = engine.whoChartSvg(config, table, { measurement, lms, z }, null);

  assert.match(svg, /<svg viewBox="0 0 860 520"/);
  assert.equal((svg.match(/<path /g) || []).length, 7);
  assert.match(svg, /Current: 18\.50 kg\/m², z [−+]/);
  assert.doesNotMatch(svg, /NaN|Infinity|undefined/);
});

test("WHO BMI classifications use age-specific cut-offs", () => {
  const engine = loadGrowthEngine(loadGrowthData());
  assert.equal(engine.whoClassification("bmi", 1.5, "under5"), "possible risk of overweight");
  assert.equal(engine.whoClassification("bmi", 2.5, "under5"), "overweight range");
  assert.equal(engine.whoClassification("bmi", 3.5, "under5"), "obesity range");
  assert.equal(engine.whoClassification("bmi", 1.5, "fiveTo19"), "overweight range");
  assert.equal(engine.whoClassification("bmi", 2.5, "fiveTo19"), "obesity range");
  assert.equal(engine.whoClassification("bmi", -2.5, "fiveTo19"), "thinness range");
});
