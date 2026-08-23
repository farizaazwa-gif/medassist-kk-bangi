const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

test("every inline JavaScript block parses", () => {
  const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1]);

  assert.ok(blocks.length > 0, "expected inline script blocks");
  blocks.forEach((source, index) => {
    assert.doesNotThrow(
      () => new vm.Script(source, { filename: `index-inline-${index + 1}.js` }),
      `inline script ${index + 1} must parse`
    );
  });
});

test("browser hardening module parses", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "assets", "accessibility-hardening.js"),
    "utf8"
  );
  assert.doesNotThrow(
    () => new vm.Script(source, { filename: "accessibility-hardening.js" })
  );
});

test("physical examination enhancement parses", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "assets", "vertical-exam-layout.js"),
    "utf8"
  );
  assert.doesNotThrow(
    () => new vm.Script(source, { filename: "vertical-exam-layout.js" })
  );
});
