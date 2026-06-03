const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("manifest is valid Zotero 7 through 10 plugin metadata", () => {
  const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));

  assert.equal(manifest.manifest_version, 2);
  assert.equal(manifest.name, "SocSci/Econ Preprint Recognizer");
  assert.equal(manifest.version, "0.1.0");
  assert.equal(manifest.description, "Recognize NBER and SSRN preprint PDFs and create Zotero preprint items.");
  assert.equal(Object.hasOwn(manifest, "bootstrap"), false);
  assert.equal(manifest.applications.zotero.strict_min_version, "7.0");
  assert.equal(manifest.applications.zotero.strict_max_version, "10.0.*");
  assert.equal(manifest.applications.zotero.id, "nber-zotero-plugin@example.com");
  assert.equal(manifest.applications.zotero.update_url, "https://example.com/nber-zotero-plugin/updates.json");
  assert.deepEqual(manifest.icons, {
    "48": "assets/icon.svg",
    "96": "assets/icon.svg"
  });
});

test("package metadata uses broader preprint recognizer branding", () => {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

  assert.equal(packageJson.name, "socsci-econ-preprint-recognizer");
  assert.equal(packageJson.description, "Zotero 7 plugin for recognizing NBER and SSRN preprint PDFs.");
});

test("bootstrap file exports Zotero lifecycle hooks", () => {
  const source = fs.readFileSync("bootstrap.js", "utf8");

  assert.match(source, /function startup\(/);
  assert.match(source, /function shutdown\(/);
  assert.match(source, /function onMainWindowLoad\(/);
  assert.match(source, /function onMainWindowUnload\(/);
});
