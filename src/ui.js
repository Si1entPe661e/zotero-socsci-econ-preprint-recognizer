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
  const STRINGS = {
    en: {
      menuLabel: "Recognize NBER Working Paper",
      title: "NBER Zotero Plugin",
      success: (id) => `Created NBER preprint item ${id}.`
    },
    "zh-CN": {
      menuLabel: "识别 NBER 工作论文",
      title: "NBER Zotero 插件",
      success: (id) => `已创建 NBER 预印本条目 ${id}。`
    },
    "zh-TW": {
      menuLabel: "識別 NBER 工作論文",
      title: "NBER Zotero 外掛",
      success: (id) => `已建立 NBER 預印本條目 ${id}。`
    },
    fr: {
      menuLabel: "Reconnaître le document de travail NBER",
      title: "Extension Zotero NBER",
      success: (id) => `Élément de prépublication NBER créé ${id}.`
    },
    es: {
      menuLabel: "Reconocer documento de trabajo de NBER",
      title: "Plugin Zotero NBER",
      success: (id) => `Elemento de preprint NBER creado ${id}.`
    }
  };

  class ContextMenuUI {
    constructor(window, recognizer) {
      this.window = window;
      this.document = window.document;
      this.recognizer = recognizer;
      this.menuItem = null;
      this.popup = null;
      this.onPopupShowing = null;
      this.strings = this.getStrings();
    }

    startup() {
      const popup = this.document.getElementById("zotero-itemmenu");
      if (!popup || this.document.getElementById(MENU_ID)) return;

      const menuItem = this.document.createXULElement
        ? this.document.createXULElement("menuitem")
        : this.document.createElement("menuitem");
      menuItem.id = MENU_ID;
      menuItem.setAttribute("label", this.strings.menuLabel);
      menuItem.addEventListener("command", () => this.recognizeSelected());

      popup.appendChild(menuItem);
      this.menuItem = menuItem;
      this.popup = popup;
      this.onPopupShowing = () => this.updateMenuVisibility();
      popup.addEventListener("popupshowing", this.onPopupShowing);
      this.updateMenuVisibility();
    }

    shutdown() {
      if (this.popup && this.onPopupShowing) {
        this.popup.removeEventListener("popupshowing", this.onPopupShowing);
      }
      if (this.menuItem && this.menuItem.parentNode) {
        this.menuItem.parentNode.removeChild(this.menuItem);
      }
      this.menuItem = null;
      this.popup = null;
      this.onPopupShowing = null;
    }

    isPdfAttachment(item) {
      return Boolean(item && item.attachmentContentType === "application/pdf");
    }

    isSinglePdfSelection() {
      const pane = this.window.ZoteroPane;
      const selectedItems = pane && pane.getSelectedItems ? pane.getSelectedItems() : [];
      return selectedItems.length === 1 && this.isPdfAttachment(selectedItems[0]);
    }

    updateMenuVisibility() {
      if (!this.menuItem) return;

      const shouldShow = this.isSinglePdfSelection();
      this.menuItem.hidden = !shouldShow;
      this.menuItem.disabled = !shouldShow;
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
        this.showNotification(this.strings.title, this.strings.success(item.id));
      } catch (error) {
        this.window.Zotero.alert(null, this.strings.title, error.message);
      }
    }

    getLocale() {
      const zotero = this.window.Zotero || {};
      if (zotero.locale) return zotero.locale;
      if (zotero.getLocale) return zotero.getLocale();
      return "en";
    }

    getStrings() {
      const locale = this.getLocale();
      if (/^zh[-_]CN/i.test(locale) || /^zh[-_]Hans/i.test(locale)) return STRINGS["zh-CN"];
      if (/^zh[-_]TW/i.test(locale) || /^zh[-_]Hant/i.test(locale)) return STRINGS["zh-TW"];
      if (/^fr/i.test(locale)) return STRINGS.fr;
      if (/^es/i.test(locale)) return STRINGS.es;
      return STRINGS.en;
    }

    showNotification(title, message) {
      if (this.window.Zotero && this.window.Zotero.ProgressWindow) {
        const progressWindow = new this.window.Zotero.ProgressWindow();
        progressWindow.changeHeadline(title);
        progressWindow.addDescription(message);
        progressWindow.show();
        progressWindow.startCloseTimer(4000);
        return;
      }
      this.window.Zotero.alert(null, title, message);
    }
  }

  return {
    ContextMenuUI,
    MENU_ID,
    MENU_LABEL,
    STRINGS
  };
});
