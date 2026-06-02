const test = require("node:test");
const assert = require("node:assert/strict");

const { ContextMenuUI, MENU_ID, MENU_LABEL } = require("../src/ui");

function createElement(document, tagName) {
  const listeners = new Map();
  const element = {
    tagName,
    id: "",
    hidden: false,
    disabled: false,
    parentNode: null,
    children: [],
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) {
        listeners.delete(type);
      }
    },
    dispatchEvent(type) {
      const listener = listeners.get(type);
      if (listener) {
        listener();
      }
    },
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      if (child.id) {
        document.elements.set(child.id, child);
      }
      return child;
    },
    removeChild(child) {
      const index = this.children.indexOf(child);
      if (index !== -1) {
        this.children.splice(index, 1);
      }
      child.parentNode = null;
      if (child.id) {
        document.elements.delete(child.id);
      }
      return child;
    }
  };

  return element;
}

function createFakeUI(selectedItems = [], locale = "en-US") {
  const alerts = [];
  const progressWindows = [];
  const document = {
    elements: new Map(),
    getElementById(id) {
      return this.elements.get(id) || null;
    },
    createElement(tagName) {
      return createElement(this, tagName);
    },
    createXULElement(tagName) {
      return createElement(this, tagName);
    }
  };
  const popup = createElement(document, "menupopup");
  popup.id = "zotero-itemmenu";
  document.elements.set(popup.id, popup);

  const window = {
    document,
    ZoteroPane: {
      getSelectedItems() {
        return selectedItems;
      }
    },
    Zotero: {
      locale,
      alert(...args) {
        alerts.push(args);
      },
      ProgressWindow: class {
        constructor() {
          this.lines = [];
          progressWindows.push(this);
        }

        changeHeadline(text) {
          this.headline = text;
        }

        addDescription(text) {
          this.description = text;
        }

        show() {
          this.shown = true;
        }

        startCloseTimer(delay) {
          this.closeDelay = delay;
        }
      }
    }
  };

  const recognizer = {
    async recognizeAttachment(attachment) {
      return { id: attachment.id };
    }
  };

  return {
    window,
    document,
    popup,
    alerts,
    progressWindows,
    ui: new ContextMenuUI(window, recognizer),
    setSelectedItems(items) {
      selectedItems = items;
    }
  };
}

function pdfAttachment(id = 1) {
  return { id, attachmentContentType: "application/pdf" };
}

function nonPdfAttachment() {
  return { id: 2, attachmentContentType: "text/plain" };
}

function regularItem() {
  return { id: 3 };
}

test("startup appends a menu item with MENU_ID and MENU_LABEL", () => {
  const { document, popup, ui } = createFakeUI();

  ui.startup();

  const menuItem = document.getElementById(MENU_ID);
  assert.equal(menuItem.id, MENU_ID);
  assert.equal(menuItem.attributes.label, MENU_LABEL);
  assert.equal(menuItem.parentNode, popup);
  assert.deepEqual(popup.children, [menuItem]);
});

test("single selected PDF attachment shows and enables menu item", () => {
  const { document, popup, ui } = createFakeUI([pdfAttachment()]);

  ui.startup();
  popup.dispatchEvent("popupshowing");

  const menuItem = document.getElementById(MENU_ID);
  assert.equal(menuItem.hidden, false);
  assert.equal(menuItem.disabled, false);
});

test("single selected non-PDF attachment hides and disables menu item", () => {
  const { document, popup, ui } = createFakeUI([nonPdfAttachment()]);

  ui.startup();
  popup.dispatchEvent("popupshowing");

  const menuItem = document.getElementById(MENU_ID);
  assert.equal(menuItem.hidden, true);
  assert.equal(menuItem.disabled, true);
});

test("single selected regular item hides and disables menu item", () => {
  const { document, popup, ui } = createFakeUI([regularItem()]);

  ui.startup();
  popup.dispatchEvent("popupshowing");

  const menuItem = document.getElementById(MENU_ID);
  assert.equal(menuItem.hidden, true);
  assert.equal(menuItem.disabled, true);
});

test("multiple selections hide and disable menu item", () => {
  const { document, popup, ui } = createFakeUI([pdfAttachment(1), pdfAttachment(2)]);

  ui.startup();
  popup.dispatchEvent("popupshowing");

  const menuItem = document.getElementById(MENU_ID);
  assert.equal(menuItem.hidden, true);
  assert.equal(menuItem.disabled, true);
});

test("no selected item hides and disables menu item", () => {
  const { document, popup, ui } = createFakeUI([]);

  ui.startup();
  popup.dispatchEvent("popupshowing");

  const menuItem = document.getElementById(MENU_ID);
  assert.equal(menuItem.hidden, true);
  assert.equal(menuItem.disabled, true);
});

test("shutdown removes menu item", () => {
  const { document, popup, ui } = createFakeUI([pdfAttachment()]);

  ui.startup();
  const menuItem = document.getElementById(MENU_ID);
  ui.shutdown();

  assert.equal(document.getElementById(MENU_ID), null);
  assert.equal(menuItem.parentNode, null);
  assert.deepEqual(popup.children, []);
});

test("successful recognition uses Zotero progress window instead of alert", async () => {
  const { alerts, progressWindows, ui } = createFakeUI([pdfAttachment(42)]);

  await ui.recognizeSelected();

  assert.deepEqual(alerts, []);
  assert.equal(progressWindows.length, 1);
  assert.equal(progressWindows[0].headline, "NBER Zotero Plugin");
  assert.match(progressWindows[0].description, /Created NBER preprint item 42/);
  assert.equal(progressWindows[0].shown, true);
});

test("uses Simplified Chinese labels for zh-CN locale", async () => {
  const { document, progressWindows, ui } = createFakeUI([pdfAttachment(43)], "zh-CN");

  ui.startup();
  await ui.recognizeSelected();

  const menuItem = document.getElementById(MENU_ID);
  assert.equal(menuItem.attributes.label, "识别 NBER 工作论文");
  assert.equal(progressWindows[0].headline, "NBER Zotero 插件");
  assert.match(progressWindows[0].description, /已创建 NBER 预印本条目 43/);
});

test("uses localized labels for supported non-English locales", () => {
  const cases = [
    ["zh-TW", "識別 NBER 工作論文"],
    ["fr-FR", "Reconnaître le document de travail NBER"],
    ["es-ES", "Reconocer documento de trabajo de NBER"],
    ["de-DE", "Recognize NBER Working Paper"]
  ];

  for (const [locale, expectedLabel] of cases) {
    const { document, ui } = createFakeUI([pdfAttachment()], locale);
    ui.startup();
    assert.equal(document.getElementById(MENU_ID).attributes.label, expectedLabel);
  }
});
