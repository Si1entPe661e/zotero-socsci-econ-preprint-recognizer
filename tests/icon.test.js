const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("plugin icon is an original SVG asset", () => {
  const icon = fs.readFileSync("assets/icon.svg", "utf8");

  assert.match(icon, /<svg[^>]+viewBox="0 0 96 96"/);
  assert.match(icon, /NBER working paper recognition icon/);
  assert.doesNotMatch(icon, /copyright|trademark|logo/i);
});
