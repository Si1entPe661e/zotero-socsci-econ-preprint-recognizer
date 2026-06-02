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

## Install In Zotero

Supported Zotero versions:

- Zotero 7 or newer

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
