const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("manifest is valid Zotero 7+ plugin metadata", () => {
  const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));

  assert.equal(manifest.manifest_version, 2);
  assert.equal(manifest.name, "NBER Zotero Plugin");
  assert.equal(manifest.version, "0.1.0");
  assert.equal(manifest.bootstrap, true);
  assert.equal(manifest.applications.zotero.strict_min_version, "7.0");
  assert.equal(manifest.applications.zotero.strict_max_version, "*");
  assert.match(manifest.applications.zotero.id, /^nber-zotero-plugin@/);
});

test("bootstrap file exports Zotero lifecycle hooks", () => {
  const source = fs.readFileSync("bootstrap.js", "utf8");

  assert.match(source, /function startup\(/);
  assert.match(source, /function shutdown\(/);
  assert.match(source, /function onMainWindowLoad\(/);
  assert.match(source, /function onMainWindowUnload\(/);
});
