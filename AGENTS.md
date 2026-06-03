# Repository Guidelines

## Project Structure & Module Organization

This repository is a Zotero 7+ plugin for recognizing NBER Working Paper PDFs. Core plugin code lives in `src/`: `index.js` wires plugin lifecycle and recognition flow, `nber-id.js` extracts paper IDs, `nber-metadata.js` fetches metadata, `nber-page-parser.js` maps NBER pages, `zotero-item-writer.js` writes Zotero items, and `ui.js` owns context-menu UI behavior. Root files `bootstrap.js` and `manifest.json` are Zotero extension entry points. Tests live in `tests/`, with fixtures in `tests/fixtures/`. Static assets are in `assets/`, build output goes to ignored `dist/`, and manual verification notes are in `docs/manual-test.md`.

## Build, Test, and Development Commands

- `npm test`: runs all unit tests with Node's built-in `node:test` runner.
- `npm run build`: packages `manifest.json`, `bootstrap.js`, `src/`, and `assets/` into `dist/nber-zotero-plugin.xpi`.
- `bash scripts/build-xpi.sh`: direct build script invocation; useful when debugging packaging.

Run `npm test` before building, then install the generated XPI in Zotero via Tools > Add-ons > Install Add-on From File.

## Coding Style & Naming Conventions

Use CommonJS modules and the existing UMD-style wrapper pattern for code that must run in both Node tests and Zotero. Match the current JavaScript style: two-space indentation, double quotes, semicolons, `const`/`let`, and descriptive camelCase identifiers. Keep file names lowercase with hyphens, for example `nber-page-parser.js`. Prefer small, testable functions with Zotero APIs injected or isolated so Node tests can run without Zotero.

## Testing Guidelines

Tests use `node:test` and `node:assert/strict`; name files `*.test.js` under `tests/`. Add focused tests beside the behavior you change, and extend fixtures in `tests/fixtures/` for parser or metadata cases. Cover both successful recognition paths and failure paths, especially missing IDs, malformed metadata, and Zotero API edge cases. Manual Zotero checks should follow `docs/manual-test.md` after any UI, manifest, or packaging change.

## Commit & Pull Request Guidelines

Recent history uses Conventional Commit prefixes such as `feat:` and `fix:`. Keep commits focused and imperative, for example `fix: handle uppercase NBER PDF IDs`. Pull requests should describe the user-visible change, list automated and manual tests run, link related issues, and include screenshots or short notes for UI/menu changes. Do not commit generated `dist/` artifacts unless a release process explicitly requires them.

## Security & Configuration Tips

Avoid committing local Zotero profiles, logs, generated XPIs, or dependency folders. Treat network parsing changes carefully: validate NBER IDs before fetching and keep metadata mapping deterministic for repeatable tests.
