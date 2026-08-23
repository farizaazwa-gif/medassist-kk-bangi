const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { ROOT, INDEX_HTML: html } = require("./helpers/source-tools.js");

test("all browser assets referenced by the production page exist", () => {
  const srcs = [...html.matchAll(/<script[^>]+\bsrc="([^"]+\.js)"/gi)].map(match => match[1]);
  assert.ok(srcs.length > 0, "production page must load JavaScript assets");
  srcs.forEach(src => {
    assert.equal(fs.existsSync(path.join(ROOT, src)), true, `${src} must exist`);
  });
});

test("all progressively loaded clinical enhancements exist", () => {
  const loaderPath = path.join(ROOT, "assets", "clinical-safety.js");
  const loader = fs.readFileSync(loaderPath, "utf8");
  const assets = [...new Set(
    [...loader.matchAll(/new URL\("([^"]+\.js)"/g)].map(match => match[1])
  )];
  assert.ok(assets.length >= 3, "expected progressive clinical enhancements");
  assets.forEach(asset => {
    const localPath = asset.startsWith("assets/")
      ? path.join(ROOT, asset)
      : path.join(ROOT, "assets", asset);
    assert.equal(fs.existsSync(localPath), true, `${asset} must exist`);
  });
});

test("release metadata and CI guardrails remain enabled", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  const workflow = fs.readFileSync(
    path.join(ROOT, ".github", "workflows", "clinical-regression.yml"),
    "utf8"
  );
  assert.match(pkg.version, /^18\.\d+\.0$/);
  assert.equal(pkg.scripts.test, "node --test");
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /branches:\s*\n\s*- main/);
  assert.match(workflow, /run:\s*npm test/);
  assert.match(workflow, /cancel-in-progress:\s*true/);
});
