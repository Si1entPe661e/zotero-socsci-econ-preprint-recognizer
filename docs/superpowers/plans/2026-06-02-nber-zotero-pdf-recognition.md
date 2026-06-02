# NBER Zotero PDF Recognition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Zotero 7 plugin that adds a PDF attachment right-click action to recognize NBER Working Papers, create a new `preprint` parent item, and attach the selected PDF under it.

**Architecture:** Keep Zotero host integration thin and isolate testable logic in pure JavaScript modules. The UI module registers one context-menu action; the recognizer extracts a NBER ID, fetches/parses metadata, maps it to a Zotero item payload, and passes that payload to a Zotero writer boundary.

**Tech Stack:** Zotero 7 bootstrapped plugin, JavaScript, Node.js built-in `node:test` for pure unit tests, shell zip packaging for `.xpi`.

---

## File Structure

- `manifest.json`: Zotero extension manifest with ID, name, version, compatibility, and bootstrap entry.
- `bootstrap.js`: Zotero bootstrap hooks; loads plugin modules and delegates startup/shutdown/window lifecycle.
- `src/nber-id.js`: Pure functions for extracting and normalizing NBER Working Paper IDs.
- `src/nber-page-parser.js`: Pure HTML metadata parser focused on citation meta tags and stable NBER text patterns.
- `src/nber-metadata.js`: Fetches the NBER paper page and returns normalized metadata.
- `src/zotero-item-writer.js`: Converts normalized metadata into a Zotero `preprint` item and reparents the selected PDF attachment.
- `src/ui.js`: Registers/removes the PDF attachment context-menu item.
- `src/index.js`: Orchestrates one recognition run for the selected Zotero PDF attachment.
- `tests/nber-id.test.js`: Unit tests for ID extraction.
- `tests/nber-page-parser.test.js`: Unit tests for parsing synthetic NBER-like HTML.
- `tests/metadata-mapping.test.js`: Unit tests for converting parsed metadata to Zotero item fields.
- `tests/fixtures/nber-w12345.html`: Synthetic fixture with title, author, abstract, date, DOI, and citation meta tags.
- `scripts/build-xpi.sh`: Packages the plugin into `dist/nber-zotero-plugin.xpi`.
- `package.json`: Test/build scripts.
- `.gitignore`: Ignores `dist/`, `node_modules/`, and local Zotero artifacts.
- `docs/manual-test.md`: Manual Zotero installation and verification steps.

### Task 1: Project Scaffold And Package Validation

**Files:**
- Create: `package.json`
- Create: `manifest.json`
- Create: `bootstrap.js`
- Create: `scripts/build-xpi.sh`
- Create: `.gitignore`
- Create: `tests/manifest.test.js`

- [ ] **Step 1: Write the manifest validation test**

Create `tests/manifest.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("manifest is valid Zotero 7 plugin metadata", () => {
  const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));

  assert.equal(manifest.manifest_version, 2);
  assert.equal(manifest.name, "NBER Zotero Plugin");
  assert.equal(manifest.version, "0.1.0");
  assert.equal(manifest.bootstrap, true);
  assert.equal(manifest.applications.zotero.strict_min_version, "7.0");
  assert.match(manifest.applications.zotero.id, /^nber-zotero-plugin@/);
});

test("bootstrap file exports Zotero lifecycle hooks", () => {
  const source = fs.readFileSync("bootstrap.js", "utf8");

  assert.match(source, /function startup\(/);
  assert.match(source, /function shutdown\(/);
  assert.match(source, /function onMainWindowLoad\(/);
  assert.match(source, /function onMainWindowUnload\(/);
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npm test -- tests/manifest.test.js
```

Expected: command fails because `package.json`, `manifest.json`, or `bootstrap.js` does not exist yet.

- [ ] **Step 3: Add project scaffold**

Create `package.json`:

```json
{
  "name": "nber-zotero-plugin",
  "version": "0.1.0",
  "private": true,
  "description": "Zotero 7 plugin for recognizing NBER Working Paper PDFs.",
  "scripts": {
    "test": "node --test",
    "build": "bash scripts/build-xpi.sh"
  },
  "devDependencies": {}
}
```

Create `manifest.json`:

```json
{
  "manifest_version": 2,
  "name": "NBER Zotero Plugin",
  "version": "0.1.0",
  "description": "Recognize NBER Working Paper PDFs and create Zotero preprint items.",
  "author": "Zhicheng",
  "homepage_url": "https://www.nber.org/",
  "applications": {
    "zotero": {
      "id": "nber-zotero-plugin@local",
      "strict_min_version": "7.0",
      "strict_max_version": "7.*"
    }
  },
  "bootstrap": true
}
```

Create `bootstrap.js`:

```js
var NBERZoteroPlugin;

function startup(data, reason) {
  Services.scriptloader.loadSubScript(data.rootURI + "src/index.js");
  NBERZoteroPlugin = new NBERZotero.Plugin(data);
  NBERZoteroPlugin.startup();
}

function shutdown(data, reason) {
  if (NBERZoteroPlugin) {
    NBERZoteroPlugin.shutdown();
    NBERZoteroPlugin = null;
  }
}

function install(data, reason) {}

function uninstall(data, reason) {}

function onMainWindowLoad({ window }) {
  if (NBERZoteroPlugin) {
    NBERZoteroPlugin.onMainWindowLoad(window);
  }
}

function onMainWindowUnload({ window }) {
  if (NBERZoteroPlugin) {
    NBERZoteroPlugin.onMainWindowUnload(window);
  }
}
```

Create `scripts/build-xpi.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
XPI_PATH="$DIST_DIR/nber-zotero-plugin.xpi"

rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

cd "$ROOT_DIR"
zip -r "$XPI_PATH" manifest.json bootstrap.js src >/dev/null
echo "$XPI_PATH"
```

Create `.gitignore`:

```gitignore
dist/
node_modules/
*.xpi
*.log
.DS_Store
```

- [ ] **Step 4: Make the build script executable**

Run:

```bash
chmod +x scripts/build-xpi.sh
```

Expected: no output.

- [ ] **Step 5: Run the manifest test**

Run:

```bash
npm test -- tests/manifest.test.js
```

Expected: PASS for both manifest tests.

- [ ] **Step 6: Commit scaffold**

```bash
git add .gitignore package.json manifest.json bootstrap.js scripts/build-xpi.sh tests/manifest.test.js
git commit -m "chore: scaffold Zotero plugin"
```

### Task 2: NBER ID Extraction

**Files:**
- Create: `src/nber-id.js`
- Create: `tests/nber-id.test.js`

- [ ] **Step 1: Write failing ID extraction tests**

Create `tests/nber-id.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { extractNberId, normalizeNberId } = require("../src/nber-id");

test("normalizes NBER IDs", () => {
  assert.equal(normalizeNberId("W34533"), "w34533");
  assert.equal(normalizeNberId("34533"), "w34533");
  assert.equal(normalizeNberId(" w34533 "), "w34533");
});

test("extracts ID from PDF file names", () => {
  assert.equal(extractNberId("w34533.pdf"), "w34533");
  assert.equal(extractNberId("NBER Working Paper w34533 - title.pdf"), "w34533");
});

test("extracts ID from DOI strings", () => {
  assert.equal(extractNberId("doi:10.3386/w34533"), "w34533");
  assert.equal(extractNberId("https://doi.org/10.3386/w34533"), "w34533");
});

test("extracts ID from NBER paper URLs", () => {
  assert.equal(extractNberId("https://www.nber.org/papers/w34533"), "w34533");
  assert.equal(extractNberId("www.nber.org/system/files/working_papers/w34533/w34533.pdf"), "w34533");
});

test("returns null when no ID exists", () => {
  assert.equal(extractNberId("ordinary-paper.pdf"), null);
  assert.equal(normalizeNberId("abc"), null);
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npm test -- tests/nber-id.test.js
```

Expected: FAIL because `src/nber-id.js` does not exist.

- [ ] **Step 3: Implement the parser**

Create `src/nber-id.js`:

```js
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

  return {
    extractNberId,
    normalizeNberId
  };
});
```

- [ ] **Step 4: Run ID tests**

Run:

```bash
npm test -- tests/nber-id.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit ID extraction**

```bash
git add src/nber-id.js tests/nber-id.test.js
git commit -m "feat: extract NBER working paper IDs"
```

### Task 3: NBER Page Parser And Metadata Mapping

**Files:**
- Create: `src/nber-page-parser.js`
- Create: `tests/fixtures/nber-w12345.html`
- Create: `tests/nber-page-parser.test.js`
- Create: `tests/metadata-mapping.test.js`

- [ ] **Step 1: Add synthetic NBER-like fixture**

Create `tests/fixtures/nber-w12345.html`:

```html
<!doctype html>
<html>
  <head>
    <meta name="citation_title" content="Labor Markets and Monetary Policy">
    <meta name="citation_author" content="Jane Doe">
    <meta name="citation_author" content="John Smith">
    <meta name="citation_publication_date" content="2026-05">
    <meta name="citation_doi" content="10.3386/w12345">
    <meta name="description" content="This paper studies a synthetic NBER-style abstract.">
    <meta property="og:url" content="https://www.nber.org/papers/w12345">
    <title>Labor Markets and Monetary Policy | NBER</title>
  </head>
  <body>
    <h1>Labor Markets and Monetary Policy</h1>
    <div class="page-header__authors">
      <a>Jane Doe</a>
      <a>John Smith</a>
    </div>
    <div class="field--name-field-paper-number">Working Paper 12345</div>
    <div class="abstract">This paper studies a synthetic NBER-style abstract.</div>
  </body>
</html>
```

- [ ] **Step 2: Write failing parser tests**

Create `tests/nber-page-parser.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { parseNberPage } = require("../src/nber-page-parser");

test("parses NBER citation metadata from HTML", () => {
  const html = fs.readFileSync("tests/fixtures/nber-w12345.html", "utf8");
  const metadata = parseNberPage(html, "w12345");

  assert.equal(metadata.id, "w12345");
  assert.equal(metadata.title, "Labor Markets and Monetary Policy");
  assert.deepEqual(metadata.authors, ["Jane Doe", "John Smith"]);
  assert.equal(metadata.date, "2026-05");
  assert.equal(metadata.doi, "10.3386/w12345");
  assert.equal(metadata.url, "https://www.nber.org/papers/w12345");
  assert.equal(metadata.abstractNote, "This paper studies a synthetic NBER-style abstract.");
  assert.equal(metadata.workingPaperNumber, "12345");
});
```

Create `tests/metadata-mapping.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { mapMetadataToPreprintPayload } = require("../src/nber-page-parser");

test("maps normalized metadata to a Zotero preprint payload", () => {
  const payload = mapMetadataToPreprintPayload({
    id: "w12345",
    title: "Labor Markets and Monetary Policy",
    authors: ["Jane Doe", "John Smith"],
    date: "2026-05",
    doi: "10.3386/w12345",
    url: "https://www.nber.org/papers/w12345",
    abstractNote: "This paper studies a synthetic NBER-style abstract.",
    workingPaperNumber: "12345"
  });

  assert.equal(payload.itemType, "preprint");
  assert.equal(payload.fields.title, "Labor Markets and Monetary Policy");
  assert.equal(payload.fields.DOI, "10.3386/w12345");
  assert.equal(payload.fields.url, "https://www.nber.org/papers/w12345");
  assert.equal(payload.fields.date, "2026-05");
  assert.equal(payload.fields.abstractNote, "This paper studies a synthetic NBER-style abstract.");
  assert.equal(payload.fields.archive, "National Bureau of Economic Research");
  assert.equal(payload.fields.repository, "National Bureau of Economic Research");
  assert.match(payload.fields.extra, /NBER Working Paper No\.: w12345/);
  assert.deepEqual(payload.creators, [
    { creatorType: "author", firstName: "Jane", lastName: "Doe" },
    { creatorType: "author", firstName: "John", lastName: "Smith" }
  ]);
});
```

- [ ] **Step 3: Run parser tests and verify they fail**

Run:

```bash
npm test -- tests/nber-page-parser.test.js tests/metadata-mapping.test.js
```

Expected: FAIL because `src/nber-page-parser.js` does not exist.

- [ ] **Step 4: Implement parser and mapper**

Create `src/nber-page-parser.js`:

```js
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
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`<meta\\s+[^>]*(?:name|property)=["']${escaped}["'][^>]*content=["']([^"']+)["'][^>]*>`, "gi");
    return [...html.matchAll(pattern)].map((match) => clean(match[1])).filter(Boolean);
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
```

- [ ] **Step 5: Run parser and mapping tests**

Run:

```bash
npm test -- tests/nber-page-parser.test.js tests/metadata-mapping.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit parser and mapper**

```bash
git add src/nber-page-parser.js tests/fixtures/nber-w12345.html tests/nber-page-parser.test.js tests/metadata-mapping.test.js
git commit -m "feat: parse NBER page metadata"
```

### Task 4: Metadata Fetch Service

**Files:**
- Create: `src/nber-metadata.js`
- Create: `tests/nber-metadata.test.js`

- [ ] **Step 1: Write failing metadata fetch tests**

Create `tests/nber-metadata.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { fetchNberMetadata } = require("../src/nber-metadata");

test("fetches and parses metadata with injected request function", async () => {
  const html = fs.readFileSync("tests/fixtures/nber-w12345.html", "utf8");
  const requests = [];
  const metadata = await fetchNberMetadata("w12345", async (url) => {
    requests.push(url);
    return html;
  });

  assert.deepEqual(requests, ["https://www.nber.org/papers/w12345"]);
  assert.equal(metadata.id, "w12345");
  assert.equal(metadata.title, "Labor Markets and Monetary Policy");
  assert.equal(metadata.doi, "10.3386/w12345");
});

test("throws clear error when request returns empty HTML", async () => {
  await assert.rejects(
    () => fetchNberMetadata("w12345", async () => ""),
    /NBER page fetch returned no content/
  );
});
```

- [ ] **Step 2: Run metadata tests and verify they fail**

Run:

```bash
npm test -- tests/nber-metadata.test.js
```

Expected: FAIL because `src/nber-metadata.js` does not exist.

- [ ] **Step 3: Implement metadata service**

Create `src/nber-metadata.js`:

```js
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
```

- [ ] **Step 4: Run metadata tests**

Run:

```bash
npm test -- tests/nber-metadata.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit metadata service**

```bash
git add src/nber-metadata.js tests/nber-metadata.test.js
git commit -m "feat: fetch NBER metadata"
```

### Task 5: Zotero Item Writer Boundary

**Files:**
- Create: `src/zotero-item-writer.js`
- Create: `tests/zotero-item-writer.test.js`

- [ ] **Step 1: Write failing writer tests with fake Zotero objects**

Create `tests/zotero-item-writer.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { createPreprintAndAttachPdf } = require("../src/zotero-item-writer");

test("creates preprint item and reparents selected PDF attachment", async () => {
  const savedItems = [];
  let nextID = 100;

  class FakeItem {
    constructor(itemType) {
      this.itemType = itemType;
      this.fields = {};
      this.creators = [];
      this.id = null;
      this.libraryID = null;
      this.parentID = null;
    }
    setField(name, value) {
      this.fields[name] = value;
    }
    setCreators(creators) {
      this.creators = creators;
    }
    async saveTx() {
      if (!this.id) this.id = nextID++;
      savedItems.push(this);
      return this.id;
    }
  }

  const attachment = new FakeItem("attachment");
  attachment.id = 7;
  attachment.libraryID = 1;
  attachment.attachmentContentType = "application/pdf";

  const zotero = { Item: FakeItem };
  const payload = {
    itemType: "preprint",
    fields: {
      title: "Labor Markets and Monetary Policy",
      DOI: "10.3386/w12345",
      url: "https://www.nber.org/papers/w12345",
      date: "2026-05",
      abstractNote: "Synthetic abstract.",
      archive: "National Bureau of Economic Research",
      repository: "National Bureau of Economic Research",
      extra: "NBER Working Paper No.: w12345"
    },
    creators: [{ creatorType: "author", firstName: "Jane", lastName: "Doe" }]
  };

  const item = await createPreprintAndAttachPdf(zotero, attachment, payload);

  assert.equal(item.itemType, "preprint");
  assert.equal(item.libraryID, 1);
  assert.equal(item.fields.title, "Labor Markets and Monetary Policy");
  assert.deepEqual(item.creators, payload.creators);
  assert.equal(attachment.parentID, item.id);
  assert.equal(savedItems.length, 2);
});
```

- [ ] **Step 2: Run writer tests and verify they fail**

Run:

```bash
npm test -- tests/zotero-item-writer.test.js
```

Expected: FAIL because `src/zotero-item-writer.js` does not exist.

- [ ] **Step 3: Implement writer boundary**

Create `src/zotero-item-writer.js`:

```js
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.NBERZotero = root.NBERZotero || {};
    Object.assign(root.NBERZotero, factory());
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function applyFields(item, fields) {
    for (const [field, value] of Object.entries(fields || {})) {
      if (value !== undefined && value !== null && value !== "") {
        item.setField(field, value);
      }
    }
  }

  async function createPreprintAndAttachPdf(zotero, attachment, payload) {
    const item = new zotero.Item(payload.itemType);
    item.libraryID = attachment.libraryID;
    applyFields(item, payload.fields);
    item.setCreators(payload.creators || []);
    await item.saveTx();

    attachment.parentID = item.id;
    await attachment.saveTx();

    return item;
  }

  return {
    applyFields,
    createPreprintAndAttachPdf
  };
});
```

- [ ] **Step 4: Run writer tests**

Run:

```bash
npm test -- tests/zotero-item-writer.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit writer boundary**

```bash
git add src/zotero-item-writer.js tests/zotero-item-writer.test.js
git commit -m "feat: create Zotero preprint item"
```

### Task 6: Recognition Orchestrator

**Files:**
- Create: `src/index.js`
- Create: `tests/recognition.test.js`
- Modify: `bootstrap.js`

- [ ] **Step 1: Write failing recognition tests**

Create `tests/recognition.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { Recognizer } = require("../src/index");

test("recognizer extracts ID from attachment filename and creates item", async () => {
  const calls = [];
  const attachment = {
    id: 7,
    libraryID: 1,
    attachmentContentType: "application/pdf",
    getFilename() {
      return "w12345.pdf";
    }
  };

  const recognizer = new Recognizer({
    fetchMetadata: async (id) => {
      calls.push(["fetch", id]);
      return {
        id,
        title: "Labor Markets and Monetary Policy",
        authors: ["Jane Doe"],
        date: "2026-05",
        doi: "10.3386/w12345",
        url: "https://www.nber.org/papers/w12345",
        abstractNote: "Synthetic abstract."
      };
    },
    writeItem: async (selectedAttachment, payload) => {
      calls.push(["write", selectedAttachment.id, payload.fields.title]);
      return { id: 100 };
    }
  });

  const item = await recognizer.recognizeAttachment(attachment);

  assert.equal(item.id, 100);
  assert.deepEqual(calls, [
    ["fetch", "w12345"],
    ["write", 7, "Labor Markets and Monetary Policy"]
  ]);
});

test("recognizer rejects non-PDF attachments", async () => {
  const recognizer = new Recognizer({});
  await assert.rejects(
    () => recognizer.recognizeAttachment({ attachmentContentType: "text/plain" }),
    /Selected item is not a PDF attachment/
  );
});
```

- [ ] **Step 2: Run recognition tests and verify they fail**

Run:

```bash
npm test -- tests/recognition.test.js
```

Expected: FAIL because `src/index.js` does not exist.

- [ ] **Step 3: Implement recognizer and plugin shell**

Create `src/index.js`:

```js
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
    }

    isPdfAttachment(attachment) {
      return attachment && attachment.attachmentContentType === "application/pdf";
    }

    getAttachmentFilename(attachment) {
      if (attachment.getFilename) return attachment.getFilename();
      return attachment.attachmentFilename || "";
    }

    async recognizeAttachment(attachment) {
      if (!this.isPdfAttachment(attachment)) {
        throw new Error("Selected item is not a PDF attachment");
      }

      const id = idTools.extractNberId(this.getAttachmentFilename(attachment));
      if (!id) {
        throw new Error("Could not find an NBER Working Paper ID in the PDF file name");
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
```

Modify `bootstrap.js` to load all modules before `src/index.js`:

```js
var NBERZoteroPlugin;

function load(rootURI, path) {
  Services.scriptloader.loadSubScript(rootURI + path);
}

function startup(data, reason) {
  load(data.rootURI, "src/nber-id.js");
  load(data.rootURI, "src/nber-page-parser.js");
  load(data.rootURI, "src/nber-metadata.js");
  load(data.rootURI, "src/zotero-item-writer.js");
  load(data.rootURI, "src/ui.js");
  load(data.rootURI, "src/index.js");
  NBERZoteroPlugin = new NBERZotero.Plugin(data);
  NBERZoteroPlugin.startup();
}

function shutdown(data, reason) {
  if (NBERZoteroPlugin) {
    NBERZoteroPlugin.shutdown();
    NBERZoteroPlugin = null;
  }
}

function install(data, reason) {}

function uninstall(data, reason) {}

function onMainWindowLoad({ window }) {
  if (NBERZoteroPlugin) {
    NBERZoteroPlugin.onMainWindowLoad(window);
  }
}

function onMainWindowUnload({ window }) {
  if (NBERZoteroPlugin) {
    NBERZoteroPlugin.onMainWindowUnload(window);
  }
}
```

- [ ] **Step 4: Run recognition tests**

Run:

```bash
npm test -- tests/recognition.test.js
```

Expected: PASS.

- [ ] **Step 5: Run full test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit recognizer**

```bash
git add bootstrap.js src/index.js tests/recognition.test.js
git commit -m "feat: orchestrate NBER PDF recognition"
```

### Task 7: Zotero Context Menu UI

**Files:**
- Create: `src/ui.js`
- Create: `tests/ui.test.js`

- [ ] **Step 1: Write failing UI structure tests**

Create `tests/ui.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("UI module defines context menu label and lifecycle", () => {
  const source = fs.readFileSync("src/ui.js", "utf8");

  assert.match(source, /Recognize NBER Working Paper/);
  assert.match(source, /class ContextMenuUI/);
  assert.match(source, /startup\(\)/);
  assert.match(source, /shutdown\(\)/);
  assert.match(source, /recognizeSelected\(\)/);
});
```

- [ ] **Step 2: Run UI test and verify it fails**

Run:

```bash
npm test -- tests/ui.test.js
```

Expected: FAIL because `src/ui.js` does not exist.

- [ ] **Step 3: Implement UI module**

Create `src/ui.js`:

```js
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
```

- [ ] **Step 4: Run UI test**

Run:

```bash
npm test -- tests/ui.test.js
```

Expected: PASS.

- [ ] **Step 5: Run full test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit UI**

```bash
git add src/ui.js tests/ui.test.js
git commit -m "feat: add NBER recognition context menu"
```

### Task 8: Build Package And Manual Test Guide

**Files:**
- Create: `docs/manual-test.md`
- Modify: `scripts/build-xpi.sh`

- [ ] **Step 1: Write manual test documentation**

Create `docs/manual-test.md`:

```markdown
# Manual Test Guide

## Build

Run:

```bash
npm test
npm run build
```

Expected:

- All Node unit tests pass.
- `dist/nber-zotero-plugin.xpi` exists.

## Install In Zotero 7

1. Open Zotero.
2. Open Tools > Add-ons.
3. Choose Install Add-on From File.
4. Select `dist/nber-zotero-plugin.xpi`.
5. Restart Zotero if prompted.

## Recognize A NBER PDF

1. Add a standalone PDF whose filename contains an NBER ID, for example `w12345.pdf`.
2. Right-click the PDF attachment.
3. Choose `Recognize NBER Working Paper`.
4. Confirm a new parent item is created.
5. Confirm the parent item type is `Preprint`.
6. Confirm the PDF appears under the new parent item.
7. Confirm title, authors, DOI, URL, date, abstract, and NBER source data are populated when available.

## Known First-Version Limits

- The first version identifies IDs from the file name and Zotero's indexed PDF text cache.
- If Zotero has not indexed the PDF text yet, users may need to wait for indexing or rename the PDF with the `w12345` ID.
- Existing parent items are not updated.
- Batch recognition is not included.
```

- [ ] **Step 2: Update build script to fail clearly when `src/` is missing**

Modify `scripts/build-xpi.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
XPI_PATH="$DIST_DIR/nber-zotero-plugin.xpi"

if [[ ! -d "$ROOT_DIR/src" ]]; then
  echo "src directory is missing" >&2
  exit 1
fi

rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

cd "$ROOT_DIR"
zip -r "$XPI_PATH" manifest.json bootstrap.js src >/dev/null
echo "$XPI_PATH"
```

- [ ] **Step 3: Run full tests**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 4: Build XPI**

Run:

```bash
npm run build
```

Expected: prints `dist/nber-zotero-plugin.xpi` and the file exists.

- [ ] **Step 5: Commit packaging and docs**

```bash
git add scripts/build-xpi.sh docs/manual-test.md
git commit -m "chore: document manual Zotero testing"
```

### Task 9: Add PDF Text Extraction Fallback

**Files:**
- Modify: `src/index.js`
- Modify: `tests/recognition.test.js`

- [ ] **Step 1: Add failing test for PDF text fallback**

Append to `tests/recognition.test.js`:

```js
test("recognizer extracts ID from attachment text when filename has no ID", async () => {
  const calls = [];
  const attachment = {
    id: 8,
    libraryID: 1,
    attachmentContentType: "application/pdf",
    getFilename() {
      return "download.pdf";
    }
  };

  const recognizer = new Recognizer({
    extractAttachmentText: async () => "National Bureau of Economic Research 10.3386/w54321",
    fetchMetadata: async (id) => {
      calls.push(["fetch", id]);
      return {
        id,
        title: "Synthetic Text Fallback Paper",
        authors: ["Jane Doe"],
        doi: "10.3386/w54321",
        url: "https://www.nber.org/papers/w54321"
      };
    },
    writeItem: async (selectedAttachment, payload) => {
      calls.push(["write", selectedAttachment.id, payload.fields.title]);
      return { id: 101 };
    }
  });

  const item = await recognizer.recognizeAttachment(attachment);

  assert.equal(item.id, 101);
  assert.deepEqual(calls, [
    ["fetch", "w54321"],
    ["write", 8, "Synthetic Text Fallback Paper"]
  ]);
});
```

- [ ] **Step 2: Run recognition tests and verify fallback fails**

Run:

```bash
npm test -- tests/recognition.test.js
```

Expected: FAIL because `Recognizer` does not call `extractAttachmentText`.

- [ ] **Step 3: Implement text fallback boundary**

Modify the `Recognizer` class in `src/index.js`:

```js
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
```

- [ ] **Step 4: Run recognition tests**

Run:

```bash
npm test -- tests/recognition.test.js
```

Expected: PASS.

- [ ] **Step 5: Run full tests and build**

Run:

```bash
npm test
npm run build
```

Expected: tests PASS and `dist/nber-zotero-plugin.xpi` is created.

- [ ] **Step 6: Commit PDF text fallback**

```bash
git add src/index.js tests/recognition.test.js
git commit -m "feat: detect NBER IDs from indexed PDF text"
```

## Self-Review

- Spec coverage: Tasks 1, 6, 7, and 8 implement the Zotero 7 plugin, context menu, build package, and manual test guide. Tasks 2, 3, 4, 5, and 9 implement ID extraction, metadata fetch/parse, item creation, attachment reparenting, and PDF text fallback.
- Scope control: The plan keeps batch recognition, existing parent item updates, and replacement of Zotero's built-in Retrieve Metadata command out of the first version.
- Type consistency: `Recognizer`, `fetchNberMetadata`, `mapMetadataToPreprintPayload`, and `createPreprintAndAttachPdf` are introduced before they are consumed.
- Known implementation risk: Zotero host APIs for context menus, full-text cache access, and item field names must be verified in manual testing inside Zotero 7. Pure parsing and mapping tests still provide useful coverage outside Zotero.
