const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("manifest is valid Zotero 7 through 10 plugin metadata", () => {
  const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));

  assert.equal(manifest.manifest_version, 2);
  assert.equal(manifest.name, "SocSci/Econ Preprint Recognizer");
  assert.equal(manifest.version, "0.1.0");
  assert.equal(manifest.description, "Recognize NBER and SSRN preprint PDFs and create Zotero preprint items.");
  assert.equal(manifest.homepage_url, "https://github.com/Si1entPe661e/zotero-socsci-econ-preprint-recognizer");
  assert.equal(Object.hasOwn(manifest, "bootstrap"), false);
  assert.equal(manifest.applications.zotero.strict_min_version, "7.0");
  assert.equal(manifest.applications.zotero.strict_max_version, "10.0.*");
  assert.equal(manifest.applications.zotero.id, "zotero-socsci-econ-preprint-recognizer@si1entpe661e.github.io");
  assert.equal(manifest.applications.zotero.update_url, "https://raw.githubusercontent.com/Si1entPe661e/zotero-socsci-econ-preprint-recognizer/main/updates.json");
  assert.deepEqual(manifest.icons, {
    "48": "assets/icon.svg",
    "96": "assets/icon.svg"
  });
});

test("update manifest points to the GitHub release asset", () => {
  const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
  const updates = JSON.parse(fs.readFileSync("updates.json", "utf8"));
  const zotero = manifest.applications.zotero;
  const addonUpdates = updates.addons[zotero.id].updates;

  assert.equal(addonUpdates.length, 1);
  assert.equal(addonUpdates[0].version, manifest.version);
  assert.equal(addonUpdates[0].update_link, "https://github.com/Si1entPe661e/zotero-socsci-econ-preprint-recognizer/releases/download/v0.1.0/socsci-econ-preprint-recognizer.xpi");
  assert.deepEqual(addonUpdates[0].applications.zotero, {
    strict_min_version: zotero.strict_min_version,
    strict_max_version: zotero.strict_max_version
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
