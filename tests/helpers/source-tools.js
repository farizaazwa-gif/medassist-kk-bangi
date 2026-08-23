const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..", "..");
const INDEX_HTML = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function inlineScript(id) {
  const match = INDEX_HTML.match(
    new RegExp(`<script[^>]*\\bid="${escapeRegExp(id)}"[^>]*>([\\s\\S]*?)<\\/script>`, "i")
  );
  assert.ok(match, `inline script ${id} must exist`);
  return match[1];
}

function createSandbox(extra = {}) {
  const module = { exports: {} };
  return {
    module,
    exports: module.exports,
    console,
    ...extra
  };
}

function runInlineScript(id, extra = {}) {
  const sandbox = createSandbox(extra);
  vm.runInNewContext(inlineScript(id), sandbox, { filename: `${id}.js` });
  return sandbox;
}

function runScriptPrefix(id, endMarker, exportNames = [], extra = {}) {
  const source = inlineScript(id);
  const strictMarker = '"use strict";';
  const bodyStart = source.indexOf(strictMarker);
  assert.ok(bodyStart >= 0, `${id} must use strict mode`);
  const end = source.indexOf(endMarker, bodyStart + strictMarker.length);
  assert.ok(end >= 0, `${id} must contain marker ${endMarker}`);

  const body = source.slice(bodyStart + strictMarker.length, end);
  const sandbox = createSandbox(extra);
  const exportObject = exportNames.join(", ");
  vm.runInNewContext(
    `${body}\nmodule.exports = { ${exportObject} };`,
    sandbox,
    { filename: `${id}-contract.js` }
  );
  return { exports: sandbox.module.exports, sandbox, body };
}

function createFieldDocument(initial = {}) {
  const fields = new Map();
  Object.entries(initial).forEach(([id, value]) => {
    fields.set(id, typeof value === "object" && value !== null
      ? { checked: false, value: "", ...value }
      : { checked: false, value: String(value) });
  });

  return {
    fields,
    document: {
      getElementById(id) {
        if (!fields.has(id)) fields.set(id, { checked: false, value: "" });
        return fields.get(id);
      },
      querySelectorAll() {
        return [];
      }
    }
  };
}

module.exports = {
  ROOT,
  INDEX_HTML,
  inlineScript,
  runInlineScript,
  runScriptPrefix,
  createFieldDocument
};
