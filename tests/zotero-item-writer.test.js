const test = require("node:test");
const assert = require("node:assert/strict");
const { createPreprintAndAttachPdf, updateItemFromPayload } = require("../src/zotero-item-writer");

test("creates preprint item and reparents selected PDF attachment", async () => {
  const savedItems = [];
  let nextID = 100;

  class FakeItem {
    constructor(itemType) {
      this.itemType = itemType;
      this.fields = {};
      this.creators = [];
      this.id = null;
      this.libraryID = null;
      this.parentID = null;
    }
    setField(name, value) {
      this.fields[name] = value;
    }
    setCreators(creators) {
      this.creators = creators;
    }
    async saveTx() {
      if (!this.id) this.id = nextID++;
      savedItems.push(this);
      return this.id;
    }
  }

  const attachment = new FakeItem("attachment");
  attachment.id = 7;
  attachment.libraryID = 1;
  attachment.attachmentContentType = "application/pdf";

  const zotero = { Item: FakeItem };
  const payload = {
    itemType: "preprint",
    fields: {
      title: "Labor Markets and Monetary Policy",
      DOI: "10.3386/w12345",
      url: "https://www.nber.org/papers/w12345",
      date: "2026-05",
      abstractNote: "Synthetic abstract.",
      archive: "National Bureau of Economic Research",
      repository: "National Bureau of Economic Research",
      extra: "NBER Working Paper No.: w12345"
    },
    creators: [{ creatorType: "author", firstName: "Jane", lastName: "Doe" }]
  };

  const item = await createPreprintAndAttachPdf(zotero, attachment, payload);

  assert.equal(item.itemType, "preprint");
  assert.equal(item.libraryID, 1);
  assert.equal(item.fields.title, "Labor Markets and Monetary Policy");
  assert.deepEqual(item.creators, payload.creators);
  assert.equal(attachment.parentID, item.id);
  assert.equal(savedItems.length, 2);
});

test("updates existing items by converting type before setting preprint-only fields", async () => {
  const previousZotero = globalThis.Zotero;
  globalThis.Zotero = {
    ItemTypes: {
      getID(itemType) {
        return itemType === "preprint" ? 2 : 1;
      }
    }
  };

  const item = {
    id: 70,
    itemTypeID: 1,
    itemType: "journalArticle",
    fields: {},
    creators: [],
    setType(itemTypeID) {
      this.itemTypeID = itemTypeID;
      this.itemType = itemTypeID === 2 ? "preprint" : "journalArticle";
    },
    setField(name, value) {
      if (name === "repository" && this.itemTypeID !== 2) {
        throw new Error("'repository' is not a valid field for type 'journalArticle'");
      }
      this.fields[name] = value;
    },
    setCreators(creators) {
      this.creators = creators;
    },
    async saveTx() {
      this.saved = true;
    }
  };

  try {
    await updateItemFromPayload(item, {
      itemType: "preprint",
      fields: {
        title: "Correct NBER Paper Title",
        repository: "National Bureau of Economic Research"
      },
      creators: [{ creatorType: "author", firstName: "Jane", lastName: "Doe" }]
    });

    assert.equal(item.itemType, "preprint");
    assert.equal(item.itemTypeID, 2);
    assert.equal(item.fields.repository, "National Bureau of Economic Research");
    assert.equal(item.saved, true);
  } finally {
    if (previousZotero === undefined) {
      delete globalThis.Zotero;
    } else {
      globalThis.Zotero = previousZotero;
    }
  }
});
