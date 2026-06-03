(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("./nber-id"),
      require("./nber-metadata"),
      require("./nber-page-parser"),
      require("./zotero-item-writer"),
      {}
    );
  } else {
    root.NBERZotero = root.NBERZotero || {};
    Object.assign(root.NBERZotero, factory(root.NBERZotero, root.NBERZotero, root.NBERZotero, root.NBERZotero, root.NBERZotero));
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (idTools, metadataService, parser, writer, uiModule) {
  class Recognizer {
    constructor(options = {}) {
      this.fetchMetadata = options.fetchMetadata || ((id, source) => metadataService.fetchPreprintMetadata({ id, source }));
      this.writeItem = options.writeItem || ((attachment, payload) => writer.createPreprintAndAttachPdf(Zotero, attachment, payload));
      this.updateItem = options.updateItem || ((item, payload) => writer.updateItemFromPayload(item, payload));
      this.getItemByID = options.getItemByID || ((id) => Zotero.Items.get(id));
      this.extractAttachmentText = options.extractAttachmentText || this.defaultExtractAttachmentText;
    }

    isPdfAttachment(attachment) {
      return attachment && attachment.attachmentContentType === "application/pdf";
    }

    getAttachmentFilename(attachment) {
      if (attachment.getFilename) return attachment.getFilename();
      return attachment.attachmentFilename || "";
    }

    async readTextFile(path) {
      if (!path) return "";
      if (globalThis.IOUtils && IOUtils.exists && IOUtils.readUTF8) {
        return (await IOUtils.exists(path)) ? IOUtils.readUTF8(path) : "";
      }
      if (globalThis.OS && OS.File && OS.File.exists && OS.File.read) {
        return (await OS.File.exists(path)) ? OS.File.read(path, { encoding: "utf-8" }) : "";
      }
      return "";
    }

    async defaultExtractAttachmentText(attachment) {
      if (!globalThis.Zotero || !Zotero.Fulltext || !Zotero.Fulltext.getItemCacheFile) {
        return "";
      }
      const cacheFile = await Zotero.Fulltext.getItemCacheFile(attachment);
      return this.readTextFile(cacheFile && cacheFile.path);
    }

    async recognizeAttachment(attachment) {
      if (!this.isPdfAttachment(attachment)) {
        throw new Error("Selected item is not a PDF attachment");
      }

      let identifier = idTools.extractPreprintIdentifier(this.getAttachmentFilename(attachment));
      if (!identifier) {
        const attachmentText = await this.extractAttachmentText(attachment);
        identifier = idTools.extractPreprintIdentifier(attachmentText);
      }
      if (!identifier) {
        throw new Error("Could not find an NBER Working Paper ID or SSRN abstract ID in the PDF file name or indexed PDF text");
      }

      const metadata = await this.fetchMetadata(identifier.id, identifier.source);
      const payload = parser.mapMetadataToPreprintPayload(metadata);
      return this.writeItem(attachment, payload);
    }

    getPdfAttachmentsForItem(item) {
      if (!item || !item.getAttachments) return [];
      return item.getAttachments()
        .map((id) => this.getItemByID(id))
        .filter((attachment) => this.isPdfAttachment(attachment));
    }

    async recognizeItem(item) {
      const attachments = this.getPdfAttachmentsForItem(item);
      if (attachments.length === 0) {
        throw new Error("Selected item does not have a PDF attachment");
      }

      const attachment = attachments[0];
      let identifier = idTools.extractPreprintIdentifier(this.getAttachmentFilename(attachment));
      if (!identifier) {
        const attachmentText = await this.extractAttachmentText(attachment);
        identifier = idTools.extractPreprintIdentifier(attachmentText);
      }
      if (!identifier) {
        throw new Error("Could not find an NBER Working Paper ID or SSRN abstract ID in the child PDF file name or indexed PDF text");
      }

      const metadata = await this.fetchMetadata(identifier.id, identifier.source);
      const payload = parser.mapMetadataToPreprintPayload(metadata);
      return this.updateItem(item, payload);
    }
  }

  class Plugin {
    constructor(data, options = {}) {
      this.data = data;
      this.recognizer = options.recognizer || new Recognizer();
      this.uiModule = options.uiModule || uiModule;
      this.windowProvider = options.windowProvider || (() => {
        if (globalThis.Zotero && Zotero.getMainWindows) {
          return Zotero.getMainWindows();
        }
        return [];
      });
      this.uis = new Map();
    }

    startup() {
      this.addToAllWindows();
    }

    addToAllWindows() {
      for (const window of this.windowProvider()) {
        this.addToWindow(window);
      }
    }

    addToWindow(window) {
      if (!this.uiModule.ContextMenuUI || !window || this.uis.has(window)) {
        return;
      }
      const ui = new this.uiModule.ContextMenuUI(window, this.recognizer, { rootURI: this.data.rootURI || "" });
      ui.startup();
      this.uis.set(window, ui);
    }

    removeFromWindow(window) {
      const ui = this.uis.get(window);
      if (!ui) return;
      ui.shutdown();
      this.uis.delete(window);
    }

    shutdown() {
      for (const window of this.uis.keys()) {
        this.removeFromWindow(window);
      }
    }

    onMainWindowLoad(window) {
      this.addToWindow(window);
    }

    onMainWindowUnload(window) {
      this.removeFromWindow(window);
    }
  }

  return {
    Recognizer,
    Plugin
  };
});
