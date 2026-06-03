const test = require("node:test");
const assert = require("node:assert/strict");
const { extractNberId, extractPreprintIdentifier, extractSsrnId, normalizeNberId, normalizeSsrnId } = require("../src/nber-id");

test("normalizes NBER IDs", () => {
  assert.equal(normalizeNberId("W34533"), "w34533");
  assert.equal(normalizeNberId("34533"), "w34533");
  assert.equal(normalizeNberId(" w34533 "), "w34533");
});

test("extracts ID from PDF file names", () => {
  assert.equal(extractNberId("w34533.pdf"), "w34533");
  assert.equal(extractNberId("NBER Working Paper w34533 - title.pdf"), "w34533");
});

test("extracts ID from DOI strings", () => {
  assert.equal(extractNberId("doi:10.3386/w34533"), "w34533");
  assert.equal(extractNberId("https://doi.org/10.3386/w34533"), "w34533");
});

test("extracts ID from NBER paper URLs", () => {
  assert.equal(extractNberId("https://www.nber.org/papers/w34533"), "w34533");
  assert.equal(extractNberId("www.nber.org/system/files/working_papers/w34533/w34533.pdf"), "w34533");
});

test("returns null when no ID exists", () => {
  assert.equal(extractNberId("ordinary-paper.pdf"), null);
  assert.equal(normalizeNberId("abc"), null);
});

test("normalizes SSRN IDs", () => {
  assert.equal(normalizeSsrnId("2997321"), "2997321");
  assert.equal(normalizeSsrnId(" ssrn.2997321 "), "2997321");
  assert.equal(normalizeSsrnId("abc"), null);
});

test("extracts SSRN IDs from DOI, URLs, and filenames", () => {
  assert.equal(extractSsrnId("10.2139/ssrn.2997321"), "2997321");
  assert.equal(extractSsrnId("https://ssrn.com/abstract=2997321"), "2997321");
  assert.equal(extractSsrnId("papers.ssrn.com/sol3/papers.cfm?abstract_id=2997321"), "2997321");
  assert.equal(extractSsrnId("SSRN-id-2997321.pdf"), "2997321");
});

test("extracts source-aware preprint identifiers", () => {
  assert.deepEqual(extractPreprintIdentifier("NBER w34533.pdf"), { source: "nber", id: "w34533" });
  assert.deepEqual(extractPreprintIdentifier("Available at SSRN: https://ssrn.com/abstract=2997321"), { source: "ssrn", id: "2997321" });
  assert.equal(extractPreprintIdentifier("ordinary-paper.pdf"), null);
});
