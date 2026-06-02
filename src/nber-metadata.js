(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./nber-page-parser"));
  } else {
    root.NBERZotero = root.NBERZotero || {};
    Object.assign(root.NBERZotero, factory(root.NBERZotero));
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (parser) {
  async function defaultRequest(url) {
    if (!globalThis.Zotero || !Zotero.HTTP || !Zotero.HTTP.request) {
      throw new Error("Zotero HTTP request API is unavailable");
    }
    const response = await Zotero.HTTP.request("GET", url);
    return response.responseText;
  }

  async function fetchNberMetadata(id, request = defaultRequest) {
    const normalizedId = String(id || "").toLowerCase();
    const url = `https://www.nber.org/papers/${normalizedId}`;
    const html = await request(url);

    if (!html) {
      throw new Error("NBER page fetch returned no content");
    }

    const metadata = parser.parseNberPage(html, normalizedId);
    if (!metadata.title) {
      throw new Error(`NBER page did not contain a title for ${normalizedId}`);
    }

    return metadata;
  }

  return {
    fetchNberMetadata,
    defaultRequest
  };
});
