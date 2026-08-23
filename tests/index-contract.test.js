const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

test("production metadata is present", () => {
  assert.match(html, /<html lang="en-MY">/);
  assert.match(html, /<meta[^>]+name="description"/);
  assert.match(html, /<link[^>]+rel="canonical"/);
});

test("clinical safety and accessibility modules are loaded", () => {
  assert.match(html, /assets\/clinical-safety\.js/);
  assert.match(html, /assets\/accessibility-hardening\.js/);
});

test("STOP-BANG UI uses the tested clinical safety classifier", () => {
  assert.match(html, /MedAssistClinicalSafety\?\.classifyStopBang/);
  assert.doesNotMatch(html, /s<=2\?"low":s<=4\?"intermediate":"high"/);
});

test("neuro enhancement clear function is defined before export", () => {
  const definition = html.indexOf("function clearLocalNeuroData");
  const exported = html.indexOf("clearLocalNeuroData, initErrors");
  assert.ok(definition >= 0, "clearLocalNeuroData must be defined");
  assert.ok(exported > definition, "clearLocalNeuroData must be defined before export");
});

test("unified drafts have expiry, privacy copy and a clear-all control", () => {
  assert.match(html, /DRAFT_TTL_MS\s*=\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/);
  assert.match(html, /unifiedDraftClearAll/);
  assert.match(html, /initials \/ queue number only/i);
  assert.match(html, /isSensitiveDraftField/);
});

test("static ids remain unique", () => {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual([...new Set(duplicates)], []);
});

test("tonsil examination has structured conditional fields in both dengue workflows", () => {
  ["cl", "dfu"].forEach(prefix => {
    assert.match(html, new RegExp(`id="${prefix}Tonsil"`));
    assert.match(html, new RegExp(`id="${prefix}TonsilInflammation"`));
    assert.match(html, new RegExp(`id="${prefix}TonsilEnlargedDetails"`));
    assert.match(html, new RegExp(`id="${prefix}TonsilGrade"`));
    assert.match(html, new RegExp(`id="${prefix}TonsilExudate"`));
    assert.match(html, new RegExp(`id="${prefix}TonsilDescription"`));
  });
  assert.match(html, /window\.dengueTonsilFinding\?\.\("cl"\)/);
  assert.match(html, /window\.dengueTonsilFinding\?\.\("dfu"\)/);
});

test("dengue examination defaults to normal findings with abnormal dropdown options", () => {
  const selectOptions = id => {
    const match = html.match(new RegExp(`<select id="${id}">([\\s\\S]*?)</select>`));
    assert.ok(match, `${id} select must exist`);
    return match[1];
  };

  ["cl", "dfu"].forEach(prefix => {
    const throat = selectOptions(`${prefix}Throat`);
    assert.match(throat, /^<option selected="" value="not injected">not injected<\/option>/);
    assert.match(throat, /value="injected"/);
    assert.match(throat, /value="erythematous"/);
    assert.match(throat, /value="with exudate"/);

    const enlargement = selectOptions(`${prefix}Tonsil`);
    assert.match(enlargement, /^<option selected="" value="not enlarged">Not enlarged<\/option>/);
    assert.match(enlargement, /value="enlarged"/);

    const inflammation = selectOptions(`${prefix}TonsilInflammation`);
    assert.match(inflammation, /^<option selected="" value="not inflamed">Not inflamed<\/option>/);
    assert.match(inflammation, /value="inflamed"/);

    const cervicalLn = selectOptions(`${prefix}CervicalLN`);
    assert.match(cervicalLn, /^<option selected="" value="not palpable">not palpable<\/option>/);
    assert.match(cervicalLn, /value="palpable"/);

    [throat, enlargement, inflammation, cervicalLn].forEach(options => {
      assert.doesNotMatch(options, /Not stated/);
    });
  });
});
