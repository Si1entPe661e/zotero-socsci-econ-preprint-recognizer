# Manual Test Guide

## Build

Run:

```bash
npm test
npm run build
```

Expected:

- All Node unit tests pass.
- `dist/socsci-econ-preprint-recognizer.xpi` exists.

## Install In Zotero

Supported Zotero versions:

- Zotero 7 through Zotero 10

1. Open Zotero.
2. Open Tools > Add-ons.
3. Choose Install Add-on From File.
4. Select `dist/socsci-econ-preprint-recognizer.xpi`.
5. Restart Zotero if prompted.

## Recognize A Preprint PDF

1. Add a standalone PDF whose filename contains an NBER ID, for example `w12345.pdf`, or an SSRN ID, for example `SSRN-id-2997321.pdf`.
2. Right-click the PDF attachment.
3. Choose `Recognize SocSci/Econ Preprint` or the localized equivalent.
4. Confirm a new parent item is created.
5. Confirm the parent item type is `Preprint`.
6. Confirm the PDF appears under the new parent item.
7. Confirm title, authors, DOI, URL, date, abstract, and NBER or SSRN source data are populated when available.

## Known First-Version Limits

- The recognizer identifies NBER and SSRN IDs from the file name and Zotero's indexed PDF text cache.
- If Zotero has not indexed the PDF text yet, users may need to wait for indexing or rename the PDF with an ID such as `w12345` or `SSRN-id-2997321`.
- Batch recognition is not included.
