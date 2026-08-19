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
