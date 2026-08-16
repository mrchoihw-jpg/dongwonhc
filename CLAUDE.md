# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

A single-file, no-build web app: `index.html` (~11,100 lines) is the entire codebase — markup, CSS, and JS all live in this one file. It's an internal operations dashboard for the purchasing department (구매부) of 동원헬스케어 (Dongwon Healthcare, part of the 동원약품그룹 pharmaceutical distribution group). All UI text and nearly all code comments are in Korean; domain terms (품절 = stockout, 반품 = return, 발주 = purchase order, 다미스/DAMIS = the company's internal ERP system) are load-bearing — don't translate them away when editing labels or storage keys.

There is no `package.json`, build step, linter, or test suite. Git history (`git log`) shows the file has historically been maintained by uploading/replacing it wholesale via the GitHub web UI, not via a local dev loop — so treat `index.html` itself as the single source of truth, and don't assume other tooling exists.

## Working with the file

- **Run it**: it's static HTML with only CDN `<script src>` dependencies (no npm install needed). Open `index.html` directly in a browser, or serve it locally to avoid `file://` quirks:
  ```
  python3 -m http.server 8000
  ```
- **No automated tests.** Verify changes by opening the page in a browser and exercising the relevant tab manually (upload a sample file / paste sample rows, check the derived table and export).
- **No linter/formatter is configured.** Match the existing style (2-space indent, semicolon-terminated statements, Korean comments explaining *why*, not *what*).
- Because everything is one file, use line-anchored search (`grep -n`) rather than trying to read the whole file — several lines (e.g. the embedded seal-image base64 string, ~line 10249) are tens of thousands of characters long and will blow out a naive read.
- When adding a new upload-driven feature, follow the existing per-feature pattern (see below) rather than inventing a new one — nearly every tab in this app reimplements the same paste/upload → parse → compute → render → export skeleton.

## High-level architecture

### Two independent apps in one HTML file

The file contains **two separate, non-communicating IIFEs** in `<script>` blocks:

1. **Main dashboard app** (`<script>` starting ~line 2316, ends ~line 10246). This is the whole tabbed SPA: stockout tracking, master-DB uploads, purchase-order writing, supply/inbound reconciliation, stock/damage tracking, etc.
2. **반품신청서 (return request form)** app (`<script>` starting ~line 10247, ends of file). This powers only the "반품신청서" panel — a self-contained document editor that turns pasted/uploaded return-item rows into a printable/PDF return request letter (`generatePdf`, `buildPrintPage`, `#printArea`, html2canvas + jsPDF). It keeps its own `state` object and persists to plain browser `localStorage` (key `dongwon_return_dashboard_v3`) — it deliberately does **not** go through the shared `window.storage` layer the main app uses, since a return-form draft is per-browser, not shared team data.

Don't assume functions or globals are shared between these two scripts — they aren't (note both scripts each declare their own `STORAGE_KEY` constant with different values).

### Tab / panel navigation (main app)

The sidebar renders `<div class="tab" data-tab="...">` entries grouped into sections (메인화면 / 발주 / 구매 및 반품 / 마스터DB / 테스트중). Each tab id maps 1:1 to a `<div class="panel" id="panel-<tabid>">`; `bindGlobalEvents()` wires the click-to-show-panel logic. Tabs of note:

- `summary` — landing dashboard (`renderSummaryDashboard`)
- `baljuform` — 발주서작성 (purchase order writer, prints/exports vendor order sheets)
- `mgrstatus` / `list` — stockout status by manager / editable stockout list (seeded from the hardcoded `MOKROK_RAW` / `DAMDANGJA_RAW` data snapshots near line 2313)
- `payinput` — 매입전표입력, itself a 3-way radio-switched sub-view (`panel-supply` / `panel-inbound` / `panel-pharmreg`) for "공급내역신고(건별)", "공급내역신고(전체)", and "제약사사이트 자료" invoice-reconciliation workflows
- `manageditems` — 관리품목등록 (managed-item registry, shared list)
- `stock` / `stocktrend` / `stockdamage` — inventory & damaged-stock views and their trend charts
- `returns` — hosts the separate 반품신청서 app described above (`.rt-scope` div)
- `masterdb` — the upload hub for all base reference data (see below)
- `productlookup`, `productinfo`, `productsearch2`, `pricehistory`, `checklist` — grouped under "테스트중" (in-progress/experimental features)

### Upload → compute → render pipeline

Most tabs follow the same pattern, driven by `UPLOAD_CONFIGS` (~line 2937), a map of upload-slot id → `{ sheetNames, storageKey, label, essentialColumns, ... }`. Each entry describes:
- which Excel sheet name(s)/keyword to look for,
- which columns matter (`essentialColumns`, matched either by header name or by fixed column index when header names collide),
- the storage key it's persisted under.

Flow for a given upload slot `id`:
1. User drags a file onto a `#file-<id>` drop zone, or pastes TSV/CSV text.
2. Large files are parsed off the main thread via a Blob-based Web Worker (`getParseWorker` / `parseFileInWorker`, worker source is the `PARSE_WORKER_SRC` string) using SheetJS (`XLSX`); smaller/pasted data is parsed inline.
3. Parsed rows are stored in `uploadState[id]` and persisted through `window.storage` (see Storage layer below), chunked via `splitRowsIntoChunks` if the payload is too large for one document.
4. A `recomputeFrom*()`/`compute*Results()` function derives the tab's working table from one or more `uploadState[...]` sources (e.g. `recomputeFromPumjeoldata`, `recomputeFromUsage3m`, `computeSupplyResults`, `computeInboundResults`, `computePharmregResults`, `computeBaljuRows`).
5. A matching `render*Table()`/`render*View()` function redraws the panel, including inline-editable cells (`onListCellEdit`, `onMgrCellEdit`, edit-note tracking like `supplyEditNoteFor`) and KPI/chart summaries.
6. An `export*Xls()` function (ExcelJS-based) rebuilds an export in the exact column layout a specific downstream ERP import expects (e.g. `buildDamisUploadSheet`), often forcing text-formatted cells for code columns via `forceTextFormatForColumns`.

The 공급내역신고/입고현황조회/제약사사이트 tabs additionally run a "mode" auto-detection step (`decideSupplyMode`/`decideInboundMode`/`decidePharmregMode` → `finalize*Mode` → `reconcile*Totals`) that figures out which of several known invoice layouts ("포함"/"별도" VAT modes, 7 possible modes) the pasted data matches, before rendering.

### Storage layer

All *shared* app state goes through a uniform async interface, `window.storage.get/set/delete/list(key, shared)`, rather than calling `localStorage` directly (the standalone 반품신청서 app is the one deliberate exception, described above). Two backends satisfy this interface, selected automatically:

- **Claude.ai Artifact runtime**: if the page is opened inside a Claude.ai artifact, `window.storage` already exists and is used as-is.
- **Firebase Firestore shim** (`firebaseStorageShim`, defined ~line 2242): if `window.storage` is undefined (i.e. the page is hosted standalone, e.g. on Cloudflare Pages at `dongwonhc.pages.dev`), the app installs a shim backed by Firestore, configured via the `FIREBASE_CONFIG` object near line 2135. This requires a real Firebase project (see the setup comment directly above `FIREBASE_CONFIG`) and Firestore rules opening the `stockout_dashboard` collection.

Because Firestore documents have a size cap, large uploads are split into multiple chunk documents (`storageKey + '_chunk_' + i`) via `splitRowsIntoChunks`/`byteLengthOf`, and both `storageSetWithRetry`/`storageGetWithRetry` retry with backoff since individual chunk reads/writes can transiently fail. When adding a new persisted feature, reuse `window.storage` (not raw `localStorage`) and follow the existing `*_STORAGE_KEY` naming convention (`stockout_dashboard_*` for department-specific data, `shared_*` for cross-tool master data like `shared_product_master_v1`) so it's consistent with the rest of the app and (for `shared_*` keys) usable by other internal tools reading the same Firestore collection.

The `shared` boolean argument marks data visible to everyone viewing the dashboard (most of the app) vs. per-viewer data.

### Theming

CSS custom properties on `:root` are overridden per theme via `html[data-theme="dark|navy|matte|charcoal"]` selectors (~line 39 onward); `applyAppTheme(theme)` toggles the attribute and is bound to the `#themeSelect` dropdown. The 반품신청서 print/editor surfaces (`.rt-scope`, `#printArea`) intentionally use their own `--rt-*` variables and stay white/paper-styled regardless of the active app theme, since they represent a real printed document.

### External libraries (all via CDN, no bundler)

SheetJS/`xlsx` (Excel parsing), ExcelJS (Excel export with formatting), html2canvas + jsPDF (return-form PDF export), Tesseract.js (OCR, for scanned-document workflows), Firebase compat SDKs (app/firestore/app-check, for the standalone-hosting storage backend).
