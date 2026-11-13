const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const R = require("../assets/calc-refresh.js");

test("calculator Refresh module is loaded once and exposes install/reset", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.equal((html.match(/<script src="assets\/calc-refresh\.js\?v=[0-9.]+"><\/script>/g) || []).length, 1);
  assert.match(html, /\.calc-refresh\{margin-left:8px\}/);
  for (const fn of ["install", "snapshot", "reset", "localToday"]) assert.equal(typeof R[fn], "function", fn);
  // Every calculator panel has a Back button for Refresh to sit beside.
  const panels = html.match(/<div class="calc-panel" id="calc-[a-z]+">\s*<button class="btn secondary calc-back"/g) || [];
  assert.equal(panels.length, (html.match(/<div class="calc-panel" id="calc-/g) || []).length);
});

test("today's date key is YYYY-MM-DD in local time", () => {
  assert.equal(R.localToday(new Date(2026, 10, 3, 23, 59)), "2026-11-03");
});
