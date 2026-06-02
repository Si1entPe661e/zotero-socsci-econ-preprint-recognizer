const test = require("node:test");
const assert = require("node:assert/strict");
const { Plugin, Recognizer } = require("../src/index");

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

test("recognizer extracts ID from attachment text when filename has no ID", async () => {
  const calls = [];
  const attachment = {
    id: 8,
    libraryID: 1,
    attachmentContentType: "application/pdf",
    getFilename() {
      return "download.pdf";
    }
  };

  const recognizer = new Recognizer({
    extractAttachmentText: async () => "National Bureau of Economic Research 10.3386/w54321",
    fetchMetadata: async (id) => {
      calls.push(["fetch", id]);
      return {
        id,
        title: "Synthetic Text Fallback Paper",
        authors: ["Jane Doe"],
        doi: "10.3386/w54321",
        url: "https://www.nber.org/papers/w54321"
      };
    },
    writeItem: async (selectedAttachment, payload) => {
      calls.push(["write", selectedAttachment.id, payload.fields.title]);
      return { id: 101 };
    }
  });

  const item = await recognizer.recognizeAttachment(attachment);

  assert.equal(item.id, 101);
  assert.deepEqual(calls, [
    ["fetch", "w54321"],
    ["write", 8, "Synthetic Text Fallback Paper"]
  ]);
});

test("default text extractor returns empty text when OS.File is unavailable", async () => {
  const previousZotero = globalThis.Zotero;
  const previousOS = globalThis.OS;
  globalThis.Zotero = {
    Fulltext: {
      getItemCacheFile: async () => ({ path: "/tmp/missing-cache.txt" })
    }
  };
  delete globalThis.OS;

  try {
    const recognizer = new Recognizer({});
    const text = await recognizer.defaultExtractAttachmentText({ id: 9 });
    assert.equal(text, "");
  } finally {
    if (previousZotero === undefined) {
      delete globalThis.Zotero;
    } else {
      globalThis.Zotero = previousZotero;
    }
    if (previousOS === undefined) {
      delete globalThis.OS;
    } else {
      globalThis.OS = previousOS;
    }
  }
});

test("default text extractor reads indexed text with IOUtils when OS.File is unavailable", async () => {
  const previousZotero = globalThis.Zotero;
  const previousOS = globalThis.OS;
  const previousIOUtils = globalThis.IOUtils;
  globalThis.Zotero = {
    Fulltext: {
      getItemCacheFile: async () => ({ path: "/tmp/nber-cache.txt" })
    }
  };
  delete globalThis.OS;
  globalThis.IOUtils = {
    exists: async (path) => path === "/tmp/nber-cache.txt",
    readUTF8: async (path) => `cached text from ${path} 10.3386/w54321`
  };

  try {
    const recognizer = new Recognizer({});
    const text = await recognizer.defaultExtractAttachmentText({ id: 10 });
    assert.equal(text, "cached text from /tmp/nber-cache.txt 10.3386/w54321");
  } finally {
    if (previousZotero === undefined) {
      delete globalThis.Zotero;
    } else {
      globalThis.Zotero = previousZotero;
    }
    if (previousOS === undefined) {
      delete globalThis.OS;
    } else {
      globalThis.OS = previousOS;
    }
    if (previousIOUtils === undefined) {
      delete globalThis.IOUtils;
    } else {
      globalThis.IOUtils = previousIOUtils;
    }
  }
});

test("plugin startup registers UI for already-open main windows", () => {
  const calls = [];
  class FakeContextMenuUI {
    constructor(window, recognizer) {
      this.window = window;
      this.recognizer = recognizer;
    }

    startup() {
      calls.push(["startup", this.window.id]);
    }

    shutdown() {
      calls.push(["shutdown", this.window.id]);
    }
  }

  const plugin = new Plugin({}, {
    uiModule: { ContextMenuUI: FakeContextMenuUI },
    windowProvider: () => [{ id: "main-1" }, { id: "main-2" }]
  });

  plugin.startup();
  plugin.shutdown();

  assert.deepEqual(calls, [
    ["startup", "main-1"],
    ["startup", "main-2"],
    ["shutdown", "main-1"],
    ["shutdown", "main-2"]
  ]);
});
