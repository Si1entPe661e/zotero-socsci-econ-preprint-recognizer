# NBER Zotero PDF Recognition Plugin Design

## Goal

Build a Zotero 7 plugin that lets the user right-click an existing PDF attachment, choose a NBER recognition action, and create a new `preprint` parent item populated with NBER Working Paper metadata. The selected PDF is moved under the newly created parent item.

## First Version Scope

The first version focuses on recognizing NBER Working Paper PDFs already present in a Zotero library. It does not replace Zotero's built-in metadata retrieval flow. It adds a separate, explicit menu command so the user can choose when to run NBER-specific recognition.

The primary supported input is a PDF attachment whose file name or first-page text contains one of:

- `w12345`
- `10.3386/w12345`
- `https://www.nber.org/papers/w12345`

The plugin creates a new parent item even if the PDF already has a parent item. This follows the user's selected behavior and avoids mutating existing bibliography records in the first version.

## Zotero Integration

The plugin targets Zotero 7. It uses a standard bootstrapped plugin structure with:

- `manifest.json` for plugin identity and compatibility.
- `bootstrap.js` for startup and shutdown hooks.
- A UI module that registers a PDF attachment context-menu item.
- A recognition service that extracts NBER IDs, fetches metadata, and writes Zotero items.

The menu item appears only when the selected Zotero item is a PDF attachment. The label should be clear, for example `Recognize NBER Working Paper`.

## Recognition Flow

1. Read the selected attachment item and confirm it is a PDF attachment.
2. Try to extract the NBER Working Paper ID from the attachment file name.
3. If the file name does not contain an ID, extract text from the PDF and search for DOI or NBER URL patterns.
4. Normalize the ID to lowercase `w` plus digits, such as `w34533`.
5. Build canonical metadata URLs:
   - Page URL: `https://www.nber.org/papers/<id>`
   - DOI: `10.3386/<id>`
   - PDF URL: `https://www.nber.org/system/files/working_papers/<id>/<id>.pdf`
6. Fetch and parse the NBER paper page.
7. Create a new Zotero `preprint` item.
8. Populate available metadata fields.
9. Re-parent the selected PDF attachment under the new item.
10. Save the new item and attachment changes in one user-visible operation where Zotero APIs allow it.

## Metadata Mapping

The item type is `preprint`.

Required fields:

- `title`: NBER paper title.
- `creators`: all authors in page order.
- `DOI`: `10.3386/<id>`.
- `url`: canonical NBER paper page URL.
- `abstractNote`: NBER abstract, when present.
- `date`: NBER release date, when present.

Preferred fields where Zotero supports them for `preprint`:

- `archive`: `National Bureau of Economic Research`.
- `repository`: `National Bureau of Economic Research`.
- `number`: numeric part of the NBER Working Paper ID or full `w12345`, depending on Zotero field support.

`extra` stores NBER-specific metadata that does not fit reliably into first-class Zotero fields:

```text
NBER Working Paper No.: w12345
Source: National Bureau of Economic Research
```

If JEL codes, programs, topics, or similar page metadata are parsed in the first version, they are appended to `extra` with stable labels. If they are not available, the item is still valid.

## Data Sources

The main data source is the NBER paper page because it is immediately addressable from the working paper ID and contains human-readable paper metadata.

The plugin also has a small parser boundary so future versions can add these sources without changing the UI flow:

- NBER's official working paper metadata dataset.
- A Zotero web translator for direct saving from `nber.org/papers/<id>` pages.
- A hook into Zotero's built-in metadata retrieval workflow if a stable extension point is available.

## Error Handling

If the selected item is not a PDF attachment, the command does nothing or shows a concise Zotero alert.

If no NBER ID can be found, the plugin shows an error explaining that it could not find a `w12345` ID, NBER DOI, or NBER paper URL in the file name or PDF text.

If the NBER page cannot be fetched, the plugin shows a network error and does not create an incomplete item.

If the page is fetched but some optional metadata is missing, the plugin creates the item with the available required metadata and records the NBER ID in `extra`.

## Testing Strategy

Unit tests cover pure parsing and metadata mapping:

- Extract `w12345` from file names.
- Extract `w12345` from DOI strings.
- Extract `w12345` from NBER URLs.
- Normalize IDs consistently.
- Map parsed metadata to a Zotero `preprint` item payload.

Integration smoke tests cover plugin packaging and static structure:

- `manifest.json` is valid JSON and includes Zotero 7 compatibility.
- `bootstrap.js` exports startup and shutdown functions.
- The right-click menu registration code can be loaded without syntax errors.

Manual Zotero testing covers the actual host behavior:

- Install the built `.xpi`.
- Add a standalone NBER PDF.
- Right-click the PDF and run `Recognize NBER Working Paper`.
- Confirm Zotero creates a new `preprint` parent item.
- Confirm the PDF is attached under the new parent item.
- Confirm title, authors, DOI, URL, date, abstract, and NBER working paper number are populated when available.

## Non-Goals For First Version

- Batch-recognizing many PDFs at once.
- Updating existing parent items.
- Replacing Zotero's built-in Retrieve Metadata command.
- Supporting non-NBER working paper series.
- Guaranteeing every optional NBER page field is captured.

## References

- Zotero 7 developer notes: https://www.zotero.org/support/dev/zotero_7_for_developers
- Zotero plugin development: https://www.zotero.org/support/dev/client_coding/plugin_development
- Zotero item types and fields: https://www.zotero.org/support/kb/item_types_and_fields
- NBER working paper metadata dataset: https://www.nber.org/research/data/nber-working-papers-and-chapters-metadata
