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

function createFakeUI(selectedItems = []) {
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
      alert() {}
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
