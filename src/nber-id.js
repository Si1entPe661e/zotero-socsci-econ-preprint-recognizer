(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.NBERZotero = root.NBERZotero || {};
    Object.assign(root.NBERZotero, factory());
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function normalizeNberId(value) {
    if (!value) return null;
    const trimmed = String(value).trim().toLowerCase();
    const match = trimmed.match(/^(?:w)?(\d{3,})$/);
    return match ? `w${match[1]}` : null;
  }

  function extractNberId(text) {
    if (!text) return null;
    const value = String(text);
    const patterns = [
      /10\.3386\/(w\d{3,})/i,
      /nber\.org\/papers\/(w\d{3,})/i,
      /working_papers\/(w\d{3,})\//i,
      /(?:^|[^a-z0-9])(w\d{3,})(?:[^a-z0-9]|$)/i
    ];

    for (const pattern of patterns) {
      const match = value.match(pattern);
      if (match) return normalizeNberId(match[1]);
    }

    return null;
  }

  function normalizeSsrnId(value) {
    if (!value) return null;
    const trimmed = String(value).trim().toLowerCase();
    const match = trimmed.match(/^(?:ssrn\.)?(\d{3,})$/);
    return match ? match[1] : null;
  }

  function extractSsrnId(text) {
    if (!text) return null;
    const value = String(text);
    const patterns = [
      /10\.2139\/ssrn\.(\d{3,})/i,
      /ssrn\.com\/abstract=(\d{3,})/i,
      /papers\.ssrn\.com\/sol3\/papers\.cfm\?abstract_id=(\d{3,})/i,
      /(?:^|[^a-z0-9])ssrn[-_. ]?id[-_. ]?(\d{3,})(?:[^a-z0-9]|$)/i,
      /(?:^|[^a-z0-9])ssrn(?:\.|-|_| id-| id )(\d{3,})(?:[^a-z0-9]|$)/i
    ];

    for (const pattern of patterns) {
      const match = value.match(pattern);
      if (match) return normalizeSsrnId(match[1]);
    }

    return null;
  }

  function extractPreprintIdentifier(text) {
    const nberId = extractNberId(text);
    if (nberId) return { source: "nber", id: nberId };

    const ssrnId = extractSsrnId(text);
    if (ssrnId) return { source: "ssrn", id: ssrnId };

    return null;
  }

  return {
    extractNberId,
    extractPreprintIdentifier,
    extractSsrnId,
    normalizeNberId,
    normalizeSsrnId
  };
});
