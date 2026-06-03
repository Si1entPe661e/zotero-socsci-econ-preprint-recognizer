(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.NBERZotero = root.NBERZotero || {};
    Object.assign(root.NBERZotero, factory());
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const MENU_ID = "nber-zotero-recognize-pdf";
  const MENU_LABEL = "Recognize SocSci/Econ Preprint";
  const ICON_PATH = "assets/icon-16.png";
  const MENU_ICON_DATA_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAGYktHRAAAAAAAAPlDu38AAAAHdElNRQfqBgMFKzHHm/eyAAACrUlEQVQ4y32TS2xMURyHv/99TGfmzpiaMoa2KS36iFdUWsQ7JFLxiK5Yi414rOwsLCxshC1BEBHpjlSot1TEI6RptQ1KWqZtPIoZZu7MnXuPxVAt4pec1Tnny3dO/j+d8ZE/VzQ+XZTnSd7JCv+IVNQ2omkanuetsqzgdsMwLBSqsK3I2DamaeI4Tlc6nTmu6/rIQO+jUYABkBgcii5b0nB47+6dDSXRKEoV7iulOHXmAo2NDSTevfVOn73wQYSTYw2MnwfDkyaVxJcvXUwoZIFSIOB5ikutbVRWzaSsvEy7duNOeTweB4T+noe/AYKgANd1yefzo3SlwDQNzp07T9AKomt63eWLLb6K2prcOAMATeDz1xRtd5+QzeUKWIFQJMaaWbN5PzzI1attQ/DV4ecTxwGUgoC/iNrZ00ctBKF+XjWh4jDX79xFfMbnyoUr1Oun9/4GiAjpjE3H81dkszlEhEzeYcBn0/llmKH3H0ktn7veCfqvRTZWP1Api+SRo2MNFFYwQP38avJ5FxE4/uQ+ncND7Fu9lqmRYk533Ghs6W0/xZdIs/jy3X8ZfE9nePysh1zO4VM2TftwHwc2N9FUV8eInSI5oZ9pxZGaxIg0i6a6I/v3/AZ4SjExEmbrhpVoCE8TA7S2vqHzWzc3H9zGdh0qw6VUlddz7OWtCgMdEdAK86YQQNd1ggE/gUARlbEYRaZJnDIMTUcT2DJ1HR1vEyhUl8iYTxSRTDKZSr7se82vSRRgaayUE7fa2bRoATUhi0NX2rjX98IxdT0zrgv9Pb1SNXfOtimxyTt8PjMAhS44rkuf6WJXTBFCftvxvIe6SImINAH7gBYB0IwooMRD8yOa/otuGgalgTD2giq+z5/hZvyGbblYwEGgGNj1z4r+L5H9ewACQAj4+ANh1QlIYP+XQAAAADB0RVh0c3ZnOnRpdGxlACAgIE5CRVIgd29ya2luZyBwYXBlciByZWNvZ25pdGlvbiBpY29u9ga7JQAAAABJRU5ErkJggg==";
  const STRINGS = {
    en: {
      menuLabel: "Recognize SocSci/Econ Preprint",
      title: "SocSci/Econ Preprint Recognizer",
      success: (id) => `Created preprint item ${id}.`
    },
    "zh-CN": {
      menuLabel: "识别SocSci/Econ预印本",
      title: "SocSci/Econ Preprint Recognizer",
      success: (id) => `已创建预印本条目 ${id}。`
    },
    "zh-TW": {
      menuLabel: "識別SocSci/Econ預印本",
      title: "SocSci/Econ Preprint Recognizer",
      success: (id) => `已建立預印本條目 ${id}。`
    },
    fr: {
      menuLabel: "Reconnaître le preprint SocSci/Econ",
      title: "SocSci/Econ Preprint Recognizer",
      success: (id) => `Élément de prépublication créé ${id}.`
    },
    es: {
      menuLabel: "Reconocer preprint SocSci/Econ",
      title: "SocSci/Econ Preprint Recognizer",
      success: (id) => `Elemento de preprint creado ${id}.`
    }
  };

  class ContextMenuUI {
    constructor(window, recognizer, options = {}) {
      this.window = window;
      this.document = window.document;
      this.recognizer = recognizer;
      this.rootURI = options.rootURI || "";
      this.menuItem = null;
      this.popup = null;
      this.onPopupShowing = null;
      this.strings = this.getStrings();
    }

    startup() {
      const popup = this.document.getElementById("zotero-itemmenu");
      if (!popup) return;

      const staleMenuItem = this.document.getElementById(MENU_ID);
      if (staleMenuItem && staleMenuItem.parentNode) {
        staleMenuItem.parentNode.removeChild(staleMenuItem);
      }

      const menuItem = this.document.createXULElement
        ? this.document.createXULElement("menuitem")
        : this.document.createElement("menuitem");
      menuItem.id = MENU_ID;
      menuItem.setAttribute("label", this.strings.menuLabel);
      menuItem.setAttribute("class", "menuitem-iconic");
      menuItem.setAttribute("image", this.getIconURI());
      menuItem.setAttribute("style", [
        `list-style-image: url('${this.getIconURI()}');`
      ].join(" "));
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

    isRegularItemWithAttachments(item) {
      if (!item || !item.getAttachments) return false;
      if (item.isRegularItem && !item.isRegularItem()) return false;
      return item.getAttachments().length > 0;
    }

    isRecognizableSelection(item) {
      return this.isPdfAttachment(item) || this.isRegularItemWithAttachments(item);
    }

    isSingleRecognizableSelection() {
      const pane = this.window.ZoteroPane;
      const selectedItems = pane && pane.getSelectedItems ? pane.getSelectedItems() : [];
      return selectedItems.length === 1 && this.isRecognizableSelection(selectedItems[0]);
    }

    updateMenuVisibility() {
      if (!this.menuItem) return;

      const shouldShow = this.isSingleRecognizableSelection();
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
        const selectedItem = this.getSelectedAttachment();
        const item = this.isPdfAttachment(selectedItem)
          ? await this.recognizer.recognizeAttachment(selectedItem)
          : await this.recognizer.recognizeItem(selectedItem);
        this.refreshSelectedItemPane();
        this.showNotification(this.strings.title, this.strings.success(item.id));
      } catch (error) {
        this.window.Zotero.alert(null, this.strings.title, error.message);
      }
    }

    getIconURI() {
      return MENU_ICON_DATA_URI;
    }

    refreshSelectedItemPane() {
      const pane = this.window.ZoteroPane;
      const itemPane = pane && pane.itemPane;
      if (!pane || !itemPane || typeof itemPane.render !== "function") return;
      itemPane.data = pane.getSelectedItems ? pane.getSelectedItems() : [];
      itemPane.render();
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
    ICON_PATH,
    MENU_ICON_DATA_URI,
    STRINGS
  };
});
