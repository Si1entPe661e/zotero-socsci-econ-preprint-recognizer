# SocSci/Econ Preprint Recognizer

SocSci/Econ Preprint Recognizer is a Zotero 7+ plugin for recognizing social science and economics preprint PDFs. It currently supports NBER Working Papers and SSRN papers, then creates or updates Zotero `Preprint` items with source-specific metadata.

## Features

- Recognizes NBER IDs such as `w12345`, `10.3386/w12345`, and NBER paper URLs.
- Recognizes SSRN IDs such as `SSRN-id-2997321.pdf`, `ssrn.com/abstract=2997321`, and `10.2139/ssrn.2997321`.
- Creates new Zotero `Preprint` parent items for standalone PDFs.
- Updates existing Zotero items with NBER or SSRN metadata while converting them to `Preprint`.

## Installation

1. Download or build `dist/socsci-econ-preprint-recognizer.xpi`.
2. Open Zotero.
3. Go to Tools > Add-ons.
4. Choose Install Add-on From File.
5. Select the XPI file and restart Zotero if prompted.

## Usage

1. Add a PDF to Zotero.
2. Right-click the PDF attachment or an item with a PDF attachment.
3. Choose `Recognize SocSci/Econ Preprint` or the localized equivalent.
4. Confirm the resulting item type is `Preprint`.

If Zotero has not indexed the PDF text yet, rename the PDF with a recognizable NBER or SSRN ID and try again.

## Development

Requirements:

- Node.js with the built-in `node:test` runner
- Bash
- `zip`

Commands:

```bash
npm test
npm run build
```

`npm test` runs the unit tests. `npm run build` packages the plugin into `dist/socsci-econ-preprint-recognizer.xpi`.

## Project Structure

- `src/`: plugin logic, metadata fetching, parsing, Zotero item writing, and UI.
- `tests/`: Node unit tests and HTML/JSON fixtures.
- `assets/`: plugin icons.
- `scripts/build-xpi.sh`: XPI packaging script.
- `docs/manual-test.md`: manual Zotero test checklist.
