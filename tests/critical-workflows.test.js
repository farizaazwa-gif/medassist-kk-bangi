const test = require("node:test");
const assert = require("node:assert/strict");

const { INDEX_HTML: html } = require("./helpers/source-tools.js");

const workflows = [
  {
    name: "Dengue New Case",
    page: "page-clerking",
    controls: ["clGenerate", "clGenerateReferral", "clCopy", "clCopyReferral", "clReset"],
    outputs: ["clOutput", "clReferralOutput"]
  },
  {
    name: "Dengue Follow-up",
    page: "page-clerking",
    controls: ["dfuGenerate", "dfuGenerateReferral", "dfuCopy", "dfuCopyReferral", "dfuReset"],
    outputs: ["dfuOutput", "dfuReferralOutput"]
  },
  {
    name: "Diabetes",
    page: "page-dm",
    controls: ["dmGenerate", "dmCopy", "dmReset"],
    outputs: ["dmOutput"]
  },
  {
    name: "Hypertension",
    page: "page-htn",
    controls: ["htnGenerate", "htnCopy", "htnReset"],
    outputs: ["htnOutput"]
  },
  {
    name: "Neonatal jaundice",
    page: "page-nnj",
    controls: ["nnjCalc", "nnjCopy", "nnjCopyReferral", "nnjClear"],
    outputs: ["nnjOutput", "nnjReferralLetter"]
  },
  {
    name: "RME1",
    page: "page-rme1",
    controls: ["rmeGenerateNote", "rmeGenerateReferral", "rmeGenerateAll", "rmeCopyNote", "rmeCopyReferral", "rmeClear"],
    outputs: ["rmeOutput", "rmeReferralOutput"]
  },
  {
    name: "IUCD",
    page: "page-iucd",
    controls: ["iucdGenerate", "iucdCopy", "iucdReset"],
    outputs: ["iucdOutput"]
  },
  {
    name: "ADHD",
    page: "page-neurodevelopment",
    controls: ["generateAdhdNote", "generateAdhdReferral", "generateAdhdAll"],
    outputs: ["adhdNoteOutput", "adhdReferralOutput"]
  },
  {
    name: "Autism",
    page: "page-neurodevelopment",
    controls: ["generateAutismNote", "generateAutismReferral", "generateAutismAll"],
    outputs: ["autismNoteOutput", "autismReferralOutput"]
  }
];

function tagForId(id) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`<([a-z][\\w-]*)\\b[^>]*\\bid="${escaped}"[^>]*>`, "i"));
  assert.ok(match, `${id} must exist`);
  return { name: match[1].toLowerCase(), source: match[0] };
}

workflows.forEach(workflow => {
  test(`${workflow.name} keeps its critical controls and editable outputs`, () => {
    tagForId(workflow.page);
    workflow.controls.forEach(tagForId);
    workflow.outputs.forEach(id => {
      const tag = tagForId(id);
      assert.equal(tag.name, "textarea", `${id} must remain a textarea`);
      assert.doesNotMatch(tag.source, /\b(?:readonly|disabled)\b/i, `${id} must remain editable`);
    });
  });
});

test("critical generate and reset controls remain wired to click handlers", () => {
  const bindings = [
    /\$\("clGenerate"\)\.addEventListener\("click"/,
    /\$\("clReset"\)\.addEventListener\("click"/,
    /f\$\("dfuGenerate"\)\.addEventListener\("click"/,
    /f\$\("dfuReset"\)\.addEventListener\("click"/,
    /dm\$\("dmGenerate"\)\.addEventListener\("click"/,
    /dm\$\("dmReset"\)\.addEventListener\("click"/,
    /\$\("htnGenerate"\)\.addEventListener\("click"/,
    /\$\("htnReset"\)\.addEventListener\("click"/,
    /\$\("nnjCalc"\)\.addEventListener\("click"/,
    /\$\("nnjClear"\)\.addEventListener\("click"/,
    /q\("rmeGenerateNote"\)\?\.addEventListener\("click"/,
    /q\("rmeClear"\)\?\.addEventListener\("click"/,
    /q\("iucdGenerate"\)\?\.addEventListener\("click"/,
    /q\("iucdReset"\)\?\.addEventListener\("click"/,
    /neuroEl\("generateAdhdNote"\)\?\.addEventListener\("click"/,
    /neuroEl\("generateAutismNote"\)\?\.addEventListener\("click"/
  ];
  bindings.forEach(pattern => assert.match(html, pattern));
});

test("foreigner nationality is emitted only when Foreigner is Yes", () => {
  assert.match(html, /value\("clForeigner"\)==="yes"[\s\S]{0,100}nationality:/);
  assert.match(html, /fv\("dfuForeigner"\)==="yes"[\s\S]{0,100}nationality:/);
  assert.match(html, /val\("rmeForeigner"\)==="yes"\)lines\.push\(`nationality:/);
  assert.doesNotMatch(html, /foreigner:\s*no/i);
});

test("Dengue frequency contract remains duration plus last 24 hours only", () => {
  ["clVomiting", "clVomitingCount", "clDiarrhoea", "clDiarrhoeaCount",
    "dfuVomitFrequency", "dfuVomitCount", "dfuLooseStoolFrequency", "dfuLooseStoolCount"]
    .forEach(tagForId);
  ["clVomitingDuration", "clDiarrhoeaDuration", "dfuVomitDuration", "dfuLooseStoolDuration",
    "clVomitLast24", "clStoolLast24", "dfuVomitLast24", "dfuStoolLast24"]
    .forEach(id => assert.match(html, new RegExp(id)));
  assert.match(html, /window\.dengueDailyFrequencyLines=function\(\)\{ return \[\]; \};/);
});

test("DM and HPT preserve result dates, CKD-EPI output and unnumbered plans", () => {
  ["dmResultDate", "htnResultDate"].forEach(tagForId);
  assert.doesNotMatch(html, /id="(?:dm|htn)CurrentMeds"/i);
  assert.match(html, /eGFR \(CKD-EPI 2021\)/);
  assert.match(html, /"PLAN",\.\.\.dmPlanLines\(\)/);
  assert.match(html, /plans\.forEach\(x=>lines\.push\(x\)\)/);
});

test("Dengue optional PE keeps hidden unselected fields and reset isolation", () => {
  assert.match(html, /dengue-pe-optional-hidden/);
  assert.match(html, /wrap\?\.classList\.toggle\('dengue-pe-optional-hidden',!on\)/);
  assert.match(html, /c\.prefix==='cl'\?'clReset':'dfuReset'/);
});
