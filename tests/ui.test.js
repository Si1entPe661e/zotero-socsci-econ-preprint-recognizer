const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("UI module defines context menu label and lifecycle", () => {
  const source = fs.readFileSync("src/ui.js", "utf8");

  assert.match(source, /Recognize NBER Working Paper/);
  assert.match(source, /class ContextMenuUI/);
  assert.match(source, /startup\(\)/);
  assert.match(source, /shutdown\(\)/);
  assert.match(source, /recognizeSelected\(\)/);
});
