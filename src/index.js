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
      this.fetchMetadata = options.fetchMetadata || metadataService.fetchNberMetadata;
      this.writeItem = options.writeItem || ((attachment, payload) => writer.createPreprintAndAttachPdf(Zotero, attachment, payload));
      this.extractAttachmentText = options.extractAttachmentText || this.defaultExtractAttachmentText;
    }

    isPdfAttachment(attachment) {
      return attachment && attachment.attachmentContentType === "application/pdf";
    }

    getAttachmentFilename(attachment) {
      if (attachment.getFilename) return attachment.getFilename();
      return attachment.attachmentFilename || "";
    }

    async defaultExtractAttachmentText(attachment) {
      if (!globalThis.Zotero || !Zotero.Fulltext || !Zotero.Fulltext.getItemCacheFile) {
        return "";
      }
      const cacheFile = await Zotero.Fulltext.getItemCacheFile(attachment);
      if (!cacheFile || !(await OS.File.exists(cacheFile.path))) {
        return "";
      }
      return OS.File.read(cacheFile.path, { encoding: "utf-8" });
    }

    async recognizeAttachment(attachment) {
      if (!this.isPdfAttachment(attachment)) {
        throw new Error("Selected item is not a PDF attachment");
      }

      let id = idTools.extractNberId(this.getAttachmentFilename(attachment));
      if (!id) {
        const attachmentText = await this.extractAttachmentText(attachment);
        id = idTools.extractNberId(attachmentText);
      }
      if (!id) {
        throw new Error("Could not find an NBER Working Paper ID in the PDF file name or indexed PDF text");
      }

      const metadata = await this.fetchMetadata(id);
      const payload = parser.mapMetadataToPreprintPayload(metadata);
      return this.writeItem(attachment, payload);
    }
  }

  class Plugin {
    constructor(data) {
      this.data = data;
      this.recognizer = new Recognizer();
      this.ui = null;
    }

    startup() {}

    shutdown() {
      if (this.ui) {
        this.ui.shutdown();
        this.ui = null;
      }
    }

    onMainWindowLoad(window) {
      if (uiModule.ContextMenuUI) {
        this.ui = new uiModule.ContextMenuUI(window, this.recognizer);
        this.ui.startup();
      }
    }

    onMainWindowUnload(window) {
      if (this.ui) {
        this.ui.shutdown();
        this.ui = null;
      }
    }
  }

  return {
    Recognizer,
    Plugin
  };
});
