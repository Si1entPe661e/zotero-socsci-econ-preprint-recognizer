const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { mapMetadataToPreprintPayload, parseNberPage, parseSsrnPage } = require("../src/nber-page-parser");

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

test("parses meta names case-insensitively", () => {
  const html = `
    <meta name="CITATION_AUTHOR" content="Jane Doe">
    <meta property="OG:URL" content="https://www.nber.org/papers/w12345">
  `;
  const metadata = parseNberPage(html, "w12345");

  assert.deepEqual(metadata.authors, ["Jane Doe"]);
  assert.equal(metadata.url, "https://www.nber.org/papers/w12345");
});

test("prefers paper body abstract over generic meta description", () => {
  const html = `
    <meta name="citation_title" content="Paper With Body Abstract">
    <meta name="description" content="Founded in 1920, the NBER is a private, non-profit organization.">
    <div>
      Issue Date July 2026
      This is the actual NBER working paper abstract. It describes the paper, not the site.
      Acknowledgements and Disclosures
    </div>
  `;
  const metadata = parseNberPage(html, "w12345");

  assert.equal(
    metadata.abstractNote,
    "This is the actual NBER working paper abstract. It describes the paper, not the site."
  );
});

test("parses SSRN citation metadata from HTML", () => {
  const html = fs.readFileSync("tests/fixtures/ssrn-2997321.html", "utf8");
  const metadata = parseSsrnPage(html, "2997321");

  assert.equal(metadata.source, "ssrn");
  assert.equal(metadata.id, "2997321");
  assert.equal(metadata.title, "Experimental Evidence for a Link between Labor Market Competition and Anti-Immigrant Attitudes");
  assert.deepEqual(metadata.authors, ["Jonathan Mellon"]);
  assert.equal(metadata.date, "2019/03/22");
  assert.equal(metadata.doi, "10.2139/ssrn.2997321");
  assert.equal(metadata.url, "https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2997321");
  assert.equal(metadata.abstractNote, "Anti-immigrant sentiment has become central to politics in Western Democracies.");
});

test("maps SSRN metadata to a preprint payload", () => {
  const payload = mapMetadataToPreprintPayload({
    source: "ssrn",
    id: "2997321",
    title: "SSRN Paper",
    authors: ["Jonathan Mellon"],
    date: "2019/03/22",
    doi: "10.2139/ssrn.2997321",
    url: "https://ssrn.com/abstract=2997321",
    abstractNote: "Synthetic SSRN abstract.",
    repository: "SSRN"
  });

  assert.equal(payload.itemType, "preprint");
  assert.equal(payload.fields.repository, "SSRN");
  assert.equal(payload.fields.archive, "SSRN");
  assert.match(payload.fields.extra, /SSRN Abstract ID: 2997321/);
  assert.match(payload.fields.extra, /Source: SSRN/);
});
