(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.NBERZotero = root.NBERZotero || {};
    Object.assign(root.NBERZotero, factory());
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const MENU_ID = "nber-zotero-recognize-pdf";
  const MENU_LABEL = "Recognize NBER Working Paper";

  class ContextMenuUI {
    constructor(window, recognizer) {
      this.window = window;
      this.document = window.document;
      this.recognizer = recognizer;
      this.menuItem = null;
    }

    startup() {
      const popup = this.document.getElementById("zotero-itemmenu");
      if (!popup || this.document.getElementById(MENU_ID)) return;

      const menuItem = this.document.createXULElement
        ? this.document.createXULElement("menuitem")
        : this.document.createElement("menuitem");
      menuItem.id = MENU_ID;
      menuItem.setAttribute("label", MENU_LABEL);
      menuItem.addEventListener("command", () => this.recognizeSelected());

      popup.appendChild(menuItem);
      this.menuItem = menuItem;
    }

    shutdown() {
      if (this.menuItem && this.menuItem.parentNode) {
        this.menuItem.parentNode.removeChild(this.menuItem);
      }
      this.menuItem = null;
    }

    getSelectedAttachment() {
      const pane = this.window.ZoteroPane;
      const selectedItems = pane.getSelectedItems ? pane.getSelectedItems() : [];
      return selectedItems.length === 1 ? selectedItems[0] : null;
    }

    async recognizeSelected() {
      try {
        const attachment = this.getSelectedAttachment();
        const item = await this.recognizer.recognizeAttachment(attachment);
        this.window.Zotero.alert(null, "NBER Zotero Plugin", `Created NBER preprint item ${item.id}.`);
      } catch (error) {
        this.window.Zotero.alert(null, "NBER Zotero Plugin", error.message);
      }
    }
  }

  return {
    ContextMenuUI,
    MENU_ID,
    MENU_LABEL
  };
});
