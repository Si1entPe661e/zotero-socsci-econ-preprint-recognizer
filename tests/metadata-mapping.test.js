const test = require("node:test");
const assert = require("node:assert/strict");
const { mapMetadataToPreprintPayload } = require("../src/nber-page-parser");

test("maps normalized metadata to a Zotero preprint payload", () => {
  const payload = mapMetadataToPreprintPayload({
    id: "w12345",
    title: "Labor Markets and Monetary Policy",
    authors: ["Jane Doe", "John Smith"],
    date: "2026-05",
    doi: "10.3386/w12345",
    url: "https://www.nber.org/papers/w12345",
    abstractNote: "This paper studies a synthetic NBER-style abstract.",
    workingPaperNumber: "12345"
  });

  assert.equal(payload.itemType, "preprint");
  assert.equal(payload.fields.title, "Labor Markets and Monetary Policy");
  assert.equal(payload.fields.DOI, "10.3386/w12345");
  assert.equal(payload.fields.url, "https://www.nber.org/papers/w12345");
  assert.equal(payload.fields.date, "2026-05");
  assert.equal(payload.fields.abstractNote, "This paper studies a synthetic NBER-style abstract.");
  assert.equal(payload.fields.archive, "National Bureau of Economic Research");
  assert.equal(payload.fields.repository, "National Bureau of Economic Research");
  assert.match(payload.fields.extra, /NBER Working Paper No\.: w12345/);
  assert.deepEqual(payload.creators, [
    { creatorType: "author", firstName: "Jane", lastName: "Doe" },
    { creatorType: "author", firstName: "John", lastName: "Smith" }
  ]);
});
