const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { fetchNberMetadata } = require("../src/nber-metadata");

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
