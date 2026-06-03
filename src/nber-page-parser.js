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
        const attrName = attrs.name ? attrs.name.toLowerCase() : "";
        const attrProperty = attrs.property ? attrs.property.toLowerCase() : "";
        if (attrName !== wanted && attrProperty !== wanted) return "";
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

  function textContent(html) {
    return clean(String(html || "").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "));
  }

  function extractBodyAbstract(html) {
    const text = textContent(html);
    const match = text.match(/Issue Date\s+(?:[A-Za-z]+\s+\d{4}|\d{4}(?:-\d{2})?)\s+([\s\S]+?)(?:\s+Acknowledgements and Disclosures|\s+Download Citation|\s+Related|\s+Program\(s\)|\s+Topic\(s\)|$)/i);
    return match ? clean(match[1]) : "";
  }

  function extractAbstract(html) {
    return textFromClass(html, "abstract") || extractBodyAbstract(html) || metaOne(html, "description");
  }

  function extractSsrnAbstract(html) {
    const text = textContent(html);
    const match = text.match(/Abstract\s+([\s\S]+?)\s+(?:Keywords:|Suggested Citation:|Paper statistics|Related eJournals|$)/i);
    return match ? clean(match[1]) : metaOne(html, "description");
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
      source: "nber",
      title: extractTitle(html),
      authors,
      date: metaOne(html, "citation_publication_date"),
      doi,
      url,
      abstractNote: extractAbstract(html),
      workingPaperNumber: extractWorkingPaperNumber(html, normalizedId)
    };
  }

  function parseSsrnPage(html, id) {
    const normalizedId = String(id || "").trim();
    const doi = metaOne(html, "citation_doi") || `10.2139/ssrn.${normalizedId}`;
    const url = metaOne(html, "citation_abstract_html_url") || metaOne(html, "og:url") || `https://ssrn.com/abstract=${normalizedId}`;
    const authors = metaAll(html, "citation_author");

    return {
      id: normalizedId,
      source: "ssrn",
      title: extractTitle(html),
      authors,
      date: metaOne(html, "citation_publication_date"),
      doi,
      url,
      abstractNote: extractSsrnAbstract(html),
      repository: "SSRN"
    };
  }

  function mapMetadataToPreprintPayload(metadata) {
    const id = metadata.id;
    const isSsrn = metadata.source === "ssrn";
    const repository = metadata.repository || (isSsrn ? "SSRN" : "National Bureau of Economic Research");
    const extra = isSsrn
      ? [
          `SSRN Abstract ID: ${id}`,
          `Source: ${repository}`
        ]
      : [
          `NBER Working Paper No.: ${id}`,
          `Source: ${repository}`
        ];

    return {
      itemType: "preprint",
      fields: {
        title: metadata.title,
        DOI: metadata.doi || (isSsrn ? `10.2139/ssrn.${id}` : `10.3386/${id}`),
        url: metadata.url || (isSsrn ? `https://ssrn.com/abstract=${id}` : `https://www.nber.org/papers/${id}`),
        date: metadata.date || "",
        abstractNote: metadata.abstractNote || "",
        archive: repository,
        repository,
        extra: extra.join("\n")
      },
      creators: (metadata.authors || []).map(splitName)
    };
  }

  return {
    parseNberPage,
    parseSsrnPage,
    mapMetadataToPreprintPayload,
    extractAbstract,
    extractSsrnAbstract,
    splitName
  };
});
