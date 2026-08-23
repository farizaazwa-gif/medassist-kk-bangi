const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createFieldDocument,
  runInlineScript,
  runScriptPrefix
} = require("./helpers/source-tools.js");

function approximately(actual, expected, tolerance = 0.05) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

test("date-only engine applies Naegele's 280-day rule without timezone drift", () => {
  const window = {};
  runInlineScript("medassist-date-only-script", { window });
  const dates = window.MedAssistDateOnly;

  assert.equal(dates.addDays("2026-01-01", 280), "2026-10-08");
  assert.equal(dates.addDays("2024-02-29", 280), "2024-12-05");
  assert.equal(dates.diffDays("2026-01-01", "2026-01-15"), 14);
  assert.equal(dates.display("2026-08-23"), "23/08/2026");
});

test("date-only engine rejects impossible calendar dates", () => {
  const window = {};
  runInlineScript("medassist-date-only-script", { window });
  const dates = window.MedAssistDateOnly;

  assert.equal(dates.parse("2026-02-29"), null);
  assert.equal(dates.parse("not-a-date"), null);
  assert.equal(dates.addDays("2026-02-29", 280), "");
});

test("HPT CKD-EPI 2021 calculation and G-stage boundaries remain stable", () => {
  const { document } = createFieldDocument();
  const { exports: hpt } = runScriptPrefix(
    "v18196HypertensionScript",
    "function anyPositive",
    ["egfr", "gCat", "bpCategory", "calcBmi", "bmiCategory", "frs"],
    { document }
  );

  approximately(hpt.egfr(50, "female", 100), 59.194, 0.01);
  approximately(hpt.egfr(70, "male", 200), 30.396, 0.01);
  assert.equal(hpt.gCat(90), "G1");
  assert.equal(hpt.gCat(60), "G2");
  assert.equal(hpt.gCat(45), "G3a");
  assert.equal(hpt.gCat(30), "G3b");
  assert.equal(hpt.gCat(15), "G4");
  assert.equal(hpt.gCat(14.9), "G5");
  assert.ok(Number.isNaN(hpt.egfr(17, "female", 100)));
});

test("HPT BP and BMI boundary classifications remain stable", () => {
  const { document } = createFieldDocument();
  const { exports: hpt } = runScriptPrefix(
    "v18196HypertensionScript",
    "function anyPositive",
    ["egfr", "gCat", "bpCategory", "calcBmi", "bmiCategory", "frs"],
    { document }
  );

  assert.equal(hpt.bpCategory(119, 79), "Optimal");
  assert.equal(hpt.bpCategory(120, 80), "Normal");
  assert.equal(hpt.bpCategory(140, 90), "Stage 1 (Mild)");
  assert.equal(hpt.bpCategory(160, 100), "Stage 2 (Moderate)");
  assert.equal(hpt.bpCategory(180, 110), "Stage 3 (Severe)");
  assert.equal(hpt.bmiCategory(hpt.calcBmi(160, 64)), "Normal");
  assert.equal(hpt.bmiCategory(30), "Obese");
});

test("Framingham output is reproducible and bypassed for established CVD", () => {
  const setup = createFieldDocument({
    htnSbp1: "140",
    htnAge: "55",
    htnFlpTc: "5.2",
    htnFlpHdl: "1.3",
    htnSex: "female",
    htnBpTreated: "no",
    htnSmoking: "non-smoker",
    htnDm: "no",
    htnIhd: "no",
    htnCva: "no",
    htnHf: "no"
  });
  const { exports: hpt } = runScriptPrefix(
    "v18196HypertensionScript",
    "function anyPositive",
    ["frs"],
    { document: setup.document }
  );

  assert.equal(hpt.frs(), "7.5% (10-year General CVD; untreated SBP)");
  setup.fields.get("htnIhd").value = "yes";
  assert.equal(hpt.frs(), "Established CVD — Framingham General CVD model not applicable");
  setup.fields.get("htnIhd").value = "no";
  setup.fields.get("htnAge").value = "75";
  assert.equal(hpt.frs(), "FRS not calculated (validated age 30–74)");
});

test("DM CKD-EPI result matches the shared HPT implementation", () => {
  const setup = createFieldDocument({ dmAge: "50", dmRpCreat: "100", dmSex: "female" });
  const { exports: dm } = runScriptPrefix(
    "v18200DmCpgAudited",
    "function syncDmCxGroup",
    ["calcBmi", "bmiCat", "calcEgfr", "gCat", "dmHbA1cProfile"],
    { document: setup.document }
  );

  approximately(dm.calcEgfr(), 59.194, 0.01);
  assert.equal(dm.gCat(dm.calcEgfr()), "G3a");
  assert.equal(dm.bmiCat(22.9), "Normal range");
  assert.equal(dm.bmiCat(23), "Overweight / pre-obese");
  assert.equal(dm.bmiCat(27.5), "Obese I");
});

test("DM HbA1c profile keeps standard, tight and less-tight safeguards", () => {
  const setup = createFieldDocument({
    dmHbA1cProfileChoice: "auto",
    dmMacroCx: "",
    dmHypoAssistance: "no",
    dmHypoAwareness: "yes"
  });
  const { exports: dm } = runScriptPrefix(
    "v18200DmCpgAudited",
    "function syncDmCxGroup",
    ["dmHbA1cProfile"],
    { document: setup.document }
  );

  assert.match(dm.dmHbA1cProfile(80).target, /^6\.6–7\.0%/);
  setup.fields.get("dmHbA1cProfileChoice").value = "tight";
  assert.match(dm.dmHbA1cProfile(80).target, /^≤6\.5%/);
  setup.fields.get("dmHbA1cProfileChoice").value = "auto";
  assert.match(dm.dmHbA1cProfile(40).target, /^7\.1–8\.0%/);
  setup.fields.get("dmMacroCx").value = "IHD";
  assert.match(dm.dmHbA1cProfile(80).target, /^7\.1–8\.0%/);
});

test("RME1 vital-sign parser recognises a representative TPC-OHCIS block", () => {
  const { exports: rme } = runScriptPrefix(
    "rme1AntenatalScript",
    "function extractLabs",
    ["parseVitalPaste", "parseLabPaste"],
    { document: { getElementById: () => null }, window: { MedAssistDateOnly: {} } }
  );
  const parsed = rme.parseVitalPaste(`
    Captured : 23-08-2026 10:14 AM
    BP : 120 / 80 mmHg
    Pulse Rate : 76 bpm
    Respiratory Rate : 18 /min
    Temperature : 36.8 °C
    SpO2 : 99 %
    Weight : 65.2 kg
    Height : 160 cm
  `);

  assert.equal(parsed.sbp, "120");
  assert.equal(parsed.dbp, "80");
  assert.equal(parsed.pulse, "76");
  assert.equal(parsed.rr, "18");
  assert.equal(parsed.temp, "36.8");
  assert.equal(parsed.spo2, "99");
  assert.equal(parsed.weight, "65.2");
  assert.equal(parsed.height, "160");
  assert.equal(parsed.captured, "23-08-2026 10:14 AM");
});

test("RME1 booking-lab parser preserves key clinical results", () => {
  const { exports: rme } = runScriptPrefix(
    "rme1AntenatalScript",
    "function extractLabs",
    ["parseVitalPaste", "parseLabPaste"],
    { document: { getElementById: () => null }, window: { MedAssistDateOnly: {} } }
  );
  const parsed = rme.parseLabPaste(`
Haemoglobin: 12.4
Haematocrit: 37
White Blood Cell Count: 8.5
Platelet Count: 250
MCV: 84
MCH: 28
Blood Group: O Positive
HIV: Non Reactive
VDRL: Non Reactive
HBsAg: Non Reactive
Thalassaemia screen: Negative
RBS: 5.6
  `);

  assert.equal(parsed.hb, "12.4");
  assert.equal(parsed.hct, "37");
  assert.equal(parsed.wbc, "8.5");
  assert.equal(parsed.plt, "250");
  assert.equal(parsed.mcv, "84");
  assert.equal(parsed.mch, "28");
  assert.equal(parsed.abo, "O");
  assert.equal(parsed.rh, "positive");
  assert.equal(parsed.hiv, "negative");
  assert.equal(parsed.vdrl, "negative");
  assert.equal(parsed.hbs, "negative");
  assert.equal(parsed.thal, "normal");
  assert.equal(parsed.glucose, "5.6");
});

test("structured tonsil formatter preserves normal and abnormal findings", () => {
  const setup = createFieldDocument({
    clTonsil: "not enlarged",
    clTonsilInflammation: "not inflamed",
    clTonsilGrade: "",
    clTonsilExudate: "",
    clTonsilDescription: ""
  });
  const { exports: tonsil } = runScriptPrefix(
    "v18211-tonsil-examination-script",
    "window.syncDengueTonsil",
    ["tonsilFinding"],
    { document: setup.document }
  );

  assert.equal(tonsil.tonsilFinding("cl"), "not enlarged, not inflamed");
  setup.fields.get("clTonsil").value = "enlarged";
  setup.fields.get("clTonsilInflammation").value = "inflamed";
  setup.fields.get("clTonsilGrade").value = "3";
  setup.fields.get("clTonsilExudate").value = "exudative";
  setup.fields.get("clTonsilDescription").value = "unilateral enlargement";
  assert.equal(
    tonsil.tonsilFinding("cl"),
    "enlarged (grade 3), inflamed, exudative; unilateral enlargement"
  );
});

test("Dengue PA formatter preserves SNT and hard or rigid output", () => {
  const setup = createFieldDocument({
    clPA: "SNT",
    clPATenderness: "no",
    clPAHepatomegaly: { checked: false },
    clPAAscites: { checked: false }
  });
  setup.document.querySelectorAll = () => [];
  const window = {};
  const result = runScriptPrefix(
    "v18202DenguePaRegionsScript",
    '["cl","dfu"].forEach',
    [],
    { document: setup.document, window }
  );
  const finding = result.sandbox.window.denguePaFinding;

  assert.equal(finding("cl"), "SNT");
  setup.fields.get("clPA").value = "hard / rigid";
  assert.equal(finding("cl"), "hard / rigid, non-tender");
  setup.fields.get("clPATenderness").value = "yes";
  setup.document.querySelectorAll = () => [{ value: "epigastric region" }];
  assert.equal(finding("cl"), "hard / rigid, tender over epigastric region");
});
