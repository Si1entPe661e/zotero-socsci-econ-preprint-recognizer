const test = require("node:test");
const assert = require("node:assert/strict");
const { extractNberId, normalizeNberId } = require("../src/nber-id");

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
