(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.NBERZotero = root.NBERZotero || {};
    Object.assign(root.NBERZotero, factory());
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function decodeEntities(value) {
    return String(value || "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, "\"")
      .replace(/&#39;/g, "'");
  }

  function clean(value) {
    return decodeEntities(value).replace(/\s+/g, " ").trim();
  }

  function metaAll(html, name) {
    const wanted = String(name || "").toLowerCase();
    const metaPattern = /<meta\b(?:"[^"]*"|'[^']*'|[^'">])*>/gi;
    const attrPattern = /([\w:-]+)\s*=\s*(["'])(.*?)\2/g;

    return [...String(html || "").matchAll(metaPattern)]
      .map((metaMatch) => {
        const attrs = {};
        for (const attrMatch of metaMatch[0].matchAll(attrPattern)) {
          attrs[attrMatch[1].toLowerCase()] = attrMatch[3];
        }
        if (attrs.name !== wanted && attrs.property !== wanted) return "";
        return clean(attrs.content);
      })
      .filter(Boolean);
  }

  function metaOne(html, name) {
    return metaAll(html, name)[0] || "";
  }

  function textFromClass(html, className) {
    const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`<[^>]+class=["'][^"']*${escaped}[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, "i");
    const match = html.match(pattern);
    return match ? clean(match[1].replace(/<[^>]+>/g, " ")) : "";
  }

  function extractTitle(html) {
    return metaOne(html, "citation_title") || textFromClass(html, "page-title") || "";
  }

  function extractWorkingPaperNumber(html, id) {
    const text = clean(html.replace(/<[^>]+>/g, " "));
    const match = text.match(/Working Paper\s+(?:No\.\s*)?(\d{3,})/i);
    if (match) return match[1];
    const idMatch = String(id || "").match(/w(\d+)/i);
    return idMatch ? idMatch[1] : "";
  }

  function splitName(fullName) {
    const parts = clean(fullName).split(" ").filter(Boolean);
    if (parts.length === 0) return { creatorType: "author", firstName: "", lastName: "" };
    if (parts.length === 1) return { creatorType: "author", firstName: "", lastName: parts[0] };
    return {
      creatorType: "author",
      firstName: parts.slice(0, -1).join(" "),
      lastName: parts[parts.length - 1]
    };
  }

  function parseNberPage(html, id) {
    const normalizedId = String(id || "").toLowerCase();
    const doi = metaOne(html, "citation_doi") || `10.3386/${normalizedId}`;
    const url = metaOne(html, "og:url") || `https://www.nber.org/papers/${normalizedId}`;
    const authors = metaAll(html, "citation_author");

    return {
      id: normalizedId,
      title: extractTitle(html),
      authors,
      date: metaOne(html, "citation_publication_date"),
      doi,
      url,
      abstractNote: metaOne(html, "description") || textFromClass(html, "abstract"),
      workingPaperNumber: extractWorkingPaperNumber(html, normalizedId)
    };
  }

  function mapMetadataToPreprintPayload(metadata) {
    const id = metadata.id;
    return {
      itemType: "preprint",
      fields: {
        title: metadata.title,
        DOI: metadata.doi || `10.3386/${id}`,
        url: metadata.url || `https://www.nber.org/papers/${id}`,
        date: metadata.date || "",
        abstractNote: metadata.abstractNote || "",
        archive: "National Bureau of Economic Research",
        repository: "National Bureau of Economic Research",
        extra: [
          `NBER Working Paper No.: ${id}`,
          "Source: National Bureau of Economic Research"
        ].join("\n")
      },
      creators: (metadata.authors || []).map(splitName)
    };
  }

  return {
    parseNberPage,
    mapMetadataToPreprintPayload,
    splitName
  };
});
