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

  function cleanText(value) {
    return String(value || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function formatDateParts(dateParts) {
    const parts = Array.isArray(dateParts) && Array.isArray(dateParts[0]) ? dateParts[0] : [];
    if (parts.length === 0) return "";
    return parts.map((part, index) => String(part).padStart(index === 0 ? 4 : 2, "0")).join("-");
  }

  function formatCrossrefAuthor(author) {
    const given = cleanText(author && author.given);
    const family = cleanText(author && author.family);
    return [given, family].filter(Boolean).join(" ");
  }

  function parseCrossrefSsrnMetadata(json, id) {
    const data = JSON.parse(json);
    const message = data.message || {};
    const title = Array.isArray(message.title) ? cleanText(message.title[0]) : cleanText(message.title);
    const authors = Array.isArray(message.author) ? message.author.map(formatCrossrefAuthor).filter(Boolean) : [];
    const published = message["published-online"] || message.published || message.issued || {};

    return {
      id: String(id || "").trim(),
      source: "ssrn",
      title,
      authors,
      date: formatDateParts(published["date-parts"]),
      doi: cleanText(message.DOI) || `10.2139/ssrn.${id}`,
      url: `https://ssrn.com/abstract=${id}`,
      abstractNote: cleanText(message.abstract),
      repository: "SSRN"
    };
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

  async function fetchSsrnMetadata(id, request = defaultRequest) {
    const normalizedId = String(id || "").trim();
    const url = `https://papers.ssrn.com/sol3/papers.cfm?abstract_id=${normalizedId}`;
    let pageError = null;

    try {
      const html = await request(url);
      if (!html) {
        throw new Error("SSRN page fetch returned no content");
      }

      const metadata = parser.parseSsrnPage(html, normalizedId);
      if (!metadata.title) {
        throw new Error(`SSRN page did not contain a title for ${normalizedId}`);
      }

      return metadata;
    } catch (error) {
      pageError = error;
    }

    const crossrefUrl = `https://api.crossref.org/works/${encodeURIComponent(`10.2139/ssrn.${normalizedId}`)}`;
    try {
      const json = await request(crossrefUrl);
      const metadata = parseCrossrefSsrnMetadata(json, normalizedId);
      if (!metadata.title) {
        throw new Error(`Crossref did not contain a title for SSRN ${normalizedId}`);
      }
      return metadata;
    } catch (crossrefError) {
      throw new Error(`SSRN metadata lookup failed for ${normalizedId}; SSRN page was blocked or unavailable, and Crossref fallback failed: ${crossrefError.message || crossrefError}. Original SSRN error: ${pageError && pageError.message ? pageError.message.replace(/<[^>]+>/g, " ").slice(0, 300) : pageError}`);
    }
  }

  async function fetchPreprintMetadata(identifier, request = defaultRequest) {
    if (!identifier || !identifier.source || !identifier.id) {
      throw new Error("Preprint identifier is missing a source or ID");
    }
    if (identifier.source === "nber") {
      return fetchNberMetadata(identifier.id, request);
    }
    if (identifier.source === "ssrn") {
      return fetchSsrnMetadata(identifier.id, request);
    }
    throw new Error(`Unsupported preprint source: ${identifier.source}`);
  }

  return {
    fetchNberMetadata,
    fetchPreprintMetadata,
    fetchSsrnMetadata,
    parseCrossrefSsrnMetadata,
    defaultRequest
  };
});
