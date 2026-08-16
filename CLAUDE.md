# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 핵심 원칙 (카파시 4대 원칙)

아래 4가지는 이 저장소에서 작업할 때 다른 모든 지침보다 우선합니다.

### 1. 코딩 전 명확화 — 지레짐작 금지
- 요구사항이 모호하면 코드를 먼저 쓰지 말고 먼저 질문한다. (예: 어떤 탭/업로드 슬롯을 건드리는지, 저장 키를 `shared`로 할지 개인용으로 할지, 다미스 업로드/내보내기 열 순서가 어떤 기준인지)
- 구현 경로가 여러 개면 임의로 하나를 골라 진행하지 말고 장단점을 먼저 제시한다.
- 요청이 불필요하게 복잡하면 더 단순한 대안을 먼저 제안한다.

### 2. 극단적 단순성 — 요청받은 것만 구현
- 명시적으로 요청받은 기능만 구현한다. 요청하지 않은 추상화, 신규 유틸리티 레이어, "나중에 쓸 수도 있는" 확장 포인트를 추가하지 않는다.
- 이 파일은 이미 프레임워크·빌드 시스템 없이 순수 HTML/CSS/JS로 동작한다 — 이 단순함을 깨는 방향(번들러, 프레임워크, 상태관리 라이브러리 도입 등)으로 "개선"하지 않는다. 요청받았을 때만 검토한다.
- 새 업로드 기반 기능을 추가할 때도 기존 `UPLOAD_CONFIGS` → parse → `recomputeFrom*`/`compute*Results` → `render*Table`/`render*View` → `export*Xls` 패턴을 그대로 재사용한다. 새로운 패턴을 발명하지 않는다.

### 3. 외과수술식 최소 수정
- 요청을 만족시키는 데 필요한 줄/파일만 건드린다. 관련 없는 주변 코드의 리팩터링, 포맷 변경, 주석 수정은 하지 않는다.
- 이 저장소는 `index.html` 단일 파일(~11,100줄)이므로 실수로 넓은 범위를 재포맷하면 diff가 극도로 커져 리뷰가 불가능해진다. 변경 전후로 `diff`를 떠서 의도한 줄만 바뀌었는지 반드시 확인한다.
- 본인이 만든 변경으로 인해 더 이상 쓰이지 않게 된 죽은 코드/import만 정리한다.

### 4. 목표 중심 검증
- 코드를 고치기 전에 "무엇이 성공인가"를 먼저 정의한다. 버그 수정이면 재현 방법을 먼저 확인한 뒤 고친다.
- 이 저장소에는 빌드/lint/자동 테스트가 없으므로, 검증은 **브라우저에서 직접 실행**해서 한다:
  - 로컬 서버로 띄운 뒤(아래 "개발 명령어" 참고) 해당 기능이 있는 탭을 열어 실제로 눌러본다.
  - 업로드 기반 기능이면 샘플 파일/붙여넣기 데이터로 업로드 → 계산된 표 → 내보내기까지 실제로 돌려본다.
  - 개발자 콘솔에 새로운 에러가 없는지 확인한다.
  - 여러 탭에 영향을 줄 수 있는 변경(스토리지 레이어, 전역 함수, CSS 변수 등)이면 사이드바의 16개 탭(`summary`, `baljuform`, `mgrstatus`, `list`, `payinput`, `manageditems`, `stock`, `stocktrend`, `stockdamage`, `returns`, `masterdb`, `productlookup`, `productinfo`, `productsearch2`, `pricehistory`, `checklist`)을 한 번씩 클릭해 정상 렌더 + 콘솔 에러 0건을 확인한다.
  - 변경 전 `index.html`을 `index.html.bak.<n>` 등으로 백업해두면 회귀 발생 시 즉시 롤백할 수 있다.

## What this repository is

A single-file, no-build web app: `index.html` (~11,100 lines) is the entire codebase — markup, CSS, and JS all live in this one file. It's an internal operations dashboard for the purchasing department (구매부) of 동원헬스케어 (Dongwon Healthcare, part of the 동원약품그룹 pharmaceutical distribution group). All UI text and nearly all code comments are in Korean; domain terms (품절 = stockout, 반품 = return, 발주 = purchase order, 다미스/DAMIS = the company's internal ERP system) are load-bearing — don't translate them away when editing labels or storage keys.

There is no `package.json`, build step, linter, or test suite. Git history (`git log`) shows the file has historically been maintained by uploading/replacing it wholesale via the GitHub web UI, not via a local dev loop — so treat `index.html` itself as the single source of truth, and don't assume other tooling exists.

## 개발 명령어 (build / dev / test)

이 저장소는 npm 기반 프로젝트가 아니다 — `package.json`이 없고, 빌드 스텝도 없다. 아래가 사실상 전부다.

| 목적 | 명령어 |
|---|---|
| 로컬 실행 (dev) | `python3 -m http.server 8000` 후 `http://localhost:8000/index.html` 접속. 또는 `index.html`을 브라우저로 직접 열어도 되지만, `file://`에서는 일부 동작(Web Worker 등)이 달라질 수 있어 로컬 서버 권장. |
| 빌드 (build) | **없음.** 번들링/트랜스파일 과정이 없다 — 편집한 `index.html`이 곧 배포물이다. |
| 테스트 (test) | **자동 테스트 없음.** 위 "목표 중심 검증" 항목대로 브라우저에서 수동으로 확인한다. |
| 린트/포맷 (lint) | **설정 없음.** 아래 "코딩 컨벤션"을 참고해 기존 스타일을 그대로 따른다. |
| 배포 | 이 파일을 그대로 GitHub Pages / Cloudflare Pages(`dongwonhc.pages.dev`) 등 정적 호스팅에 올리면 끝. Firebase 설정(`FIREBASE_CONFIG`, Firestore 규칙, App Check)이 맞아야 저장 기능이 동작한다 — 자세한 내용은 "Storage layer" 절 참고. |

## 코딩 컨벤션

- **스타일**: 2-space 들여쓰기, 세미콜론으로 문장 종료. 기존 코드가 이미 이 스타일이므로 새 코드도 그대로 맞춘다.
- **주석 언어**: 주석은 한국어, *무엇을 하는지*가 아니라 *왜 그렇게 했는지*를 설명한다 (예: 특정 열을 이름이 아니라 위치로 매칭하는 이유, Firestore 문서 크기 제한 때문에 청크로 나누는 이유 등). 자명한 코드에 "무엇을 하는지" 주석을 새로 달지 않는다.
- **도메인 용어는 그대로 유지**: 품절/반품/발주/다미스 같은 용어나 실제 UI 라벨, `storageKey` 문자열은 임의로 번역·개명하지 않는다. 다른 사내 도구가 같은 Firestore 컬렉션의 같은 키를 읽고 있을 수 있다.
- **함수 네이밍 패턴**: 새 업로드 기능을 추가할 때 기존 접두사 규칙을 따른다.
  - `recomputeFrom*` / `compute*Results` — 원본 업로드 데이터를 파생 테이블로 계산
  - `render*Table` / `render*View` — 계산된 데이터를 화면에 그림
  - `export*Xls` — ExcelJS로 다운스트림 ERP(다미스 등) 업로드용 포맷을 만듦
  - `bind*Tab` — 해당 탭의 이벤트 리스너를 연결
  - `decide*Mode` / `finalize*Mode` / `reconcile*Totals` — 여러 알려진 엑셀 레이아웃 중 어느 것인지 자동 판별
- **저장 키 네이밍**: `*_STORAGE_KEY` 상수로 선언. 부서 전용 데이터는 `stockout_dashboard_*`, 다른 도구와 공유하는 마스터 데이터는 `shared_*` 접두사를 쓴다. 항상 `window.storage`를 통해 읽고 쓴다 (반품신청서 앱만 예외 — 아래 참고).
- **신규 의존성 추가 금지**: CDN `<script src>`로 새 라이브러리를 추가하는 것은 사용자 승인 없이 하지 않는다. 이미 로드된 SheetJS/ExcelJS/html2canvas/jsPDF/Tesseract.js/Firebase만으로 해결 가능한지 먼저 검토한다.
- **파일 탐색**: 파일 전체를 한 번에 읽지 말고 `grep -n`으로 줄 번호를 먼저 찾는다 — 인장 이미지 base64 문자열(~10249줄)처럼 한 줄이 수만 자에 달하는 라인이 있어 무작정 읽으면 컨텍스트가 터진다.

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
- **Firebase Firestore shim** (`firebaseStorageShim`, defined ~line 2242): if `window.storage` is undefined (i.e. the page is hosted standalone, e.g. on Cloudflare Pages at `dongwonhc.pages.dev`, or GitHub Pages), the app installs a shim backed by Firestore, configured via the `FIREBASE_CONFIG` object near line 2135. This requires a real Firebase project (see the setup comment directly above `FIREBASE_CONFIG`), Firestore rules opening the `stockout_dashboard` collection, and — if App Check Enforce is turned on for that project — the deployed domain must be registered with the reCAPTCHA v3 site key (`APP_CHECK_SITE_KEY`), or Firestore calls fail with `permission-denied`.

Because Firestore documents have a size cap, large uploads are split into multiple chunk documents (`storageKey + '_chunk_' + i`) via `splitRowsIntoChunks`/`byteLengthOf`, and both `storageSetWithRetry`/`storageGetWithRetry` retry with backoff since individual chunk reads/writes can transiently fail. When adding a new persisted feature, reuse `window.storage` (not raw `localStorage`) and follow the existing `*_STORAGE_KEY` naming convention (`stockout_dashboard_*` for department-specific data, `shared_*` for cross-tool master data like `shared_product_master_v1`) so it's consistent with the rest of the app and (for `shared_*` keys) usable by other internal tools reading the same Firestore collection.

The `shared` boolean argument marks data visible to everyone viewing the dashboard (most of the app) vs. per-viewer data.

### Theming

CSS custom properties on `:root` are overridden per theme via `html[data-theme="dark|navy|matte|charcoal"]` selectors (~line 39 onward); `applyAppTheme(theme)` toggles the attribute and is bound to the `#themeSelect` dropdown. The 반품신청서 print/editor surfaces (`.rt-scope`, `#printArea`) intentionally use their own `--rt-*` variables and stay white/paper-styled regardless of the active app theme, since they represent a real printed document.

### External libraries (all via CDN, no bundler)

SheetJS/`xlsx` (Excel parsing), ExcelJS (Excel export with formatting), html2canvas + jsPDF (return-form PDF export), Tesseract.js (OCR, for scanned-document workflows), Firebase compat SDKs (app/firestore/app-check, for the standalone-hosting storage backend).
