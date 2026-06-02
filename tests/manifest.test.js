const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("manifest is valid Zotero 7 through 10 plugin metadata", () => {
  const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));

  assert.equal(manifest.manifest_version, 2);
  assert.equal(manifest.name, "NBER Zotero Plugin");
  assert.equal(manifest.version, "0.1.0");
  assert.equal(Object.hasOwn(manifest, "bootstrap"), false);
  assert.equal(manifest.applications.zotero.strict_min_version, "7.0");
  assert.equal(manifest.applications.zotero.strict_max_version, "10.0.*");
  assert.equal(manifest.applications.zotero.id, "nber-zotero-plugin@example.com");
  assert.equal(manifest.applications.zotero.update_url, "https://example.com/nber-zotero-plugin/updates.json");
});

test("bootstrap file exports Zotero lifecycle hooks", () => {
  const source = fs.readFileSync("bootstrap.js", "utf8");

  assert.match(source, /function startup\(/);
  assert.match(source, /function shutdown\(/);
  assert.match(source, /function onMainWindowLoad\(/);
  assert.match(source, /function onMainWindowUnload\(/);
});
