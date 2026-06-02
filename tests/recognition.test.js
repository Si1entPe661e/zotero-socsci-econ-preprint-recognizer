const test = require("node:test");
const assert = require("node:assert/strict");
const { Recognizer } = require("../src/index");

test("recognizer extracts ID from attachment filename and creates item", async () => {
  const calls = [];
  const attachment = {
    id: 7,
    libraryID: 1,
    attachmentContentType: "application/pdf",
    getFilename() {
      return "w12345.pdf";
    }
  };

  const recognizer = new Recognizer({
    fetchMetadata: async (id) => {
      calls.push(["fetch", id]);
      return {
        id,
        title: "Labor Markets and Monetary Policy",
        authors: ["Jane Doe"],
        date: "2026-05",
        doi: "10.3386/w12345",
        url: "https://www.nber.org/papers/w12345",
        abstractNote: "Synthetic abstract."
      };
    },
    writeItem: async (selectedAttachment, payload) => {
      calls.push(["write", selectedAttachment.id, payload.fields.title]);
      return { id: 100 };
    }
  });

  const item = await recognizer.recognizeAttachment(attachment);

  assert.equal(item.id, 100);
  assert.deepEqual(calls, [
    ["fetch", "w12345"],
    ["write", 7, "Labor Markets and Monetary Policy"]
  ]);
});

test("recognizer rejects non-PDF attachments", async () => {
  const recognizer = new Recognizer({});
  await assert.rejects(
    () => recognizer.recognizeAttachment({ attachmentContentType: "text/plain" }),
    /Selected item is not a PDF attachment/
  );
});
