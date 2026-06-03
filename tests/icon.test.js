const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("plugin icon is an original SVG asset", () => {
  const icon = fs.readFileSync("assets/icon.svg", "utf8");

  assert.match(icon, /<svg[^>]+viewBox="0 0 96 96"/);
  assert.match(icon, /NBER working paper recognition icon/);
  assert.doesNotMatch(icon, /copyright|trademark|logo/i);
});

test("context menu icon is a 16px PNG asset", () => {
  const icon = fs.readFileSync("assets/icon-16.png");

  assert.deepEqual([...icon.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(icon.readUInt32BE(16), 16);
  assert.equal(icon.readUInt32BE(20), 16);
});
