const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { fetchNberMetadata, fetchPreprintMetadata, fetchSsrnMetadata } = require("../src/nber-metadata");

test("fetches and parses metadata with injected request function", async () => {
  const html = fs.readFileSync("tests/fixtures/nber-w12345.html", "utf8");
  const requests = [];
  const metadata = await fetchNberMetadata("w12345", async (url) => {
    requests.push(url);
    return html;
  });

  assert.deepEqual(requests, ["https://www.nber.org/papers/w12345"]);
  assert.equal(metadata.id, "w12345");
  assert.equal(metadata.title, "Labor Markets and Monetary Policy");
  assert.equal(metadata.doi, "10.3386/w12345");
});

test("throws clear error when request returns empty HTML", async () => {
  await assert.rejects(
    () => fetchNberMetadata("w12345", async () => ""),
    /NBER page fetch returned no content/
  );
});

test("fetches and parses SSRN metadata with injected request function", async () => {
  const html = fs.readFileSync("tests/fixtures/ssrn-2997321.html", "utf8");
  const requests = [];
  const metadata = await fetchSsrnMetadata("2997321", async (url) => {
    requests.push(url);
    return html;
  });

  assert.deepEqual(requests, ["https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2997321"]);
  assert.equal(metadata.source, "ssrn");
  assert.equal(metadata.id, "2997321");
  assert.equal(metadata.title, "Experimental Evidence for a Link between Labor Market Competition and Anti-Immigrant Attitudes");
  assert.equal(metadata.doi, "10.2139/ssrn.2997321");
});

test("fetches source-aware preprint metadata", async () => {
  const html = fs.readFileSync("tests/fixtures/ssrn-2997321.html", "utf8");
  const metadata = await fetchPreprintMetadata({ source: "ssrn", id: "2997321" }, async () => html);

  assert.equal(metadata.repository, "SSRN");
});

test("falls back to Crossref when SSRN page is blocked by Cloudflare", async () => {
  const crossref = fs.readFileSync("tests/fixtures/crossref-ssrn-5763222.json", "utf8");
  const requests = [];
  const metadata = await fetchSsrnMetadata("5763222", async (url) => {
    requests.push(url);
    if (url.includes("papers.ssrn.com")) {
      throw new Error("HTTP GET https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5763222 failed with status code 403: <title>Just a moment...</title>");
    }
    return crossref;
  });

  assert.deepEqual(requests, [
    "https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5763222",
    "https://api.crossref.org/works/10.2139%2Fssrn.5763222"
  ]);
  assert.equal(metadata.source, "ssrn");
  assert.equal(metadata.id, "5763222");
  assert.equal(metadata.title, "The Economics of Synthetic SSRN Metadata");
  assert.deepEqual(metadata.authors, ["Jane Doe", "John Smith"]);
  assert.equal(metadata.date, "2025-06-01");
  assert.equal(metadata.doi, "10.2139/ssrn.5763222");
  assert.equal(metadata.url, "https://ssrn.com/abstract=5763222");
  assert.equal(metadata.repository, "SSRN");
});
