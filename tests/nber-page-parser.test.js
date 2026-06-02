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

test("parses citation metadata when meta content appears before name", () => {
  const html = `
    <meta content="Reversed Metadata Order" name="citation_title">
    <meta content="Jane Doe" name="citation_author">
    <meta content="John Smith" name="citation_author">
  `;
  const metadata = parseNberPage(html, "w12345");

  assert.equal(metadata.title, "Reversed Metadata Order");
  assert.deepEqual(metadata.authors, ["Jane Doe", "John Smith"]);
});

test("parses apostrophes inside double-quoted meta content values", () => {
  const html = `
    <meta name="citation_author" content="Jane O'Brien">
    <meta name="citation_title" content="Apostrophes in Names">
  `;
  const metadata = parseNberPage(html, "w12345");

  assert.deepEqual(metadata.authors, ["Jane O'Brien"]);
  assert.equal(metadata.title, "Apostrophes in Names");
});
