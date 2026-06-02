const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { parseNberPage } = require("../src/nber-page-parser");

test("parses NBER citation metadata from HTML", () => {
  const html = fs.readFileSync("tests/fixtures/nber-w12345.html", "utf8");
  const metadata = parseNberPage(html, "w12345");

  assert.equal(metadata.id, "w12345");
  assert.equal(metadata.title, "Labor Markets and Monetary Policy");
  assert.deepEqual(metadata.authors, ["Jane Doe", "John Smith"]);
  assert.equal(metadata.date, "2026-05");
  assert.equal(metadata.doi, "10.3386/w12345");
  assert.equal(metadata.url, "https://www.nber.org/papers/w12345");
  assert.equal(metadata.abstractNote, "This paper studies a synthetic NBER-style abstract.");
  assert.equal(metadata.workingPaperNumber, "12345");
});
