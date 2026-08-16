# BASELINE.md — Phase 0 회귀 베이스라인

## 1) 백업

- 파일: `index.html.bak.000`
- 원본 크기: 728,536 bytes (index.html 기준)
- 백업본 크기: 확인됨, 정상 범위 (약 712K = ~728KB)
- **주의: 이후 모든 Phase가 끝날 때까지 `index.html.bak.000`은 절대 삭제하지 않습니다.**

## 2) Claude 자동 사전 점검 (참고용 — 아래 사용자 수동 확인의 대체가 아님)

작업 샌드박스 안에서 `index.html`을 로컬 서버로 띄운 뒤 Chromium(Playwright)으로 16개 탭을 전부 클릭해 패널 표시 여부와 콘솔 에러 발생 여부를 자동으로 확인했습니다.

**결과: 16개 탭 전부 정상 표시(visible), 탭 전환 자체로 인한 신규 콘솔 에러 0건.**

| 탭 | 패널 표시 | 탭 클릭으로 인한 신규 에러 |
|---|---|---|
| summary | visible | 0 |
| baljuform | visible | 0 |
| mgrstatus | visible | 0 |
| list | visible | 0 |
| payinput | visible | 0 |
| manageditems | visible | 0 |
| stock | visible | 0 |
| stocktrend | visible | 0 |
| stockdamage | visible | 0 |
| returns | visible | 0 |
| masterdb | visible | 0 |
| productlookup | visible | 0 |
| productinfo | visible | 0 |
| productsearch2 | visible | 0 |
| pricehistory | visible | 0 |
| checklist | visible | 0 |

**중요한 한계**: 이 작업 샌드박스는 외부 CDN(cdnjs, gstatic, jsdelivr)으로 나가는 네트워크가 차단되어 있습니다. 그 결과 페이지 최초 로딩 시점에 다음과 같은 에러가 발생했습니다 (탭 클릭과는 무관, 로딩 단계에서 1회성으로 발생):

- `xlsx`, `exceljs`, `html2canvas`, `jspdf`, `tesseract.js`, Firebase 3종 스크립트 로딩 실패: `net::ERR_TUNNEL_CONNECTION_FAILED` (8건)
- 리소스 404 1건
- `Error: Firebase SDK가 로드되지 않았어요` (Firebase 스크립트 자체가 못 불러와져서 발생하는 당연한 후속 에러)

즉, 이 자동 점검은 **"탭 전환 로직이 그 자체로 새 에러를 만들지 않는다"**는 것만 검증했을 뿐, 엑셀 업로드/PDF 생성/Firebase 저장처럼 외부 라이브러리에 의존하는 실제 기능은 검증하지 못했습니다 (샌드박스에 인터넷이 없어서). 이 부분은 아래 사용자 수동 확인이 반드시 필요합니다.

## 3) 사용자 수동 확인 (게이트 조건 — 아직 미완료)

> 아래는 사용자가 실제 인터넷이 되는 브라우저에서 직접 확인해야 하는 항목입니다. Claude는 결과만 여기에 기록합니다.

- [ ] a) `index.html`을 브라우저에서 열고 개발자 콘솔을 연 뒤, 다음 16개 탭을 각각 한 번씩 클릭했다:
      summary, baljuform, mgrstatus, list, payinput, manageditems,
      stock, stocktrend, stockdamage, returns, masterdb,
      productlookup, productinfo, productsearch2, pricehistory, checklist
- [ ] b) 각 탭에서 화면이 정상적으로 렌더되었고, 콘솔에 빨간 에러가 없었다.
- [ ] c) 콘솔 에러 0개 상태 확인.
- [ ] d) Claude.ai 외부(GitHub Pages 등, 예: dongwonhc.pages.dev)에서 열었을 때 Firebase가 정상 연결되는지 확인.

**결과 기록:**
```
(사용자 확인 후 여기에 "BASELINE OK, YYYY-MM-DD" 형식으로 기록)
```

## 4) 작업 게이트

이 문서의 이후 모든 Phase는 다음 조건을 만족해야 진행합니다:

> **"콘솔 에러 0개 AND 위 3)의 16개 탭 진입 모두 성공"**

현재 상태: **PENDING** — 위 3) 사용자 수동 확인이 완료되어 "BASELINE OK"가 기록되기 전까지는 다음 Phase로 진행하지 않습니다.

## 5) Phase 1 — Firebase 보안 문구 보강 (코드 동작 무변경)

- 백업: `index.html.bak.001` (Phase 1 시작 전 스냅샷)
- 변경 라인 범위: 697~703 (fbBanner), 2116~2141 (Firestore 규칙 주석 블록), 2153~2156 (APP_CHECK_SITE_KEY 주석)
- 변경 요약: (1) fbBanner에 "배포 시 Firebase 규칙 강화 + 키 재발급 권장" 한 줄 추가, (2) Firestore 규칙 주석에 ⚠ 공개 페이지 경고 + `allow write: if request.auth != null;` 예시 + App Check Enforce 활성화 절차 3줄 추가, (3) `APP_CHECK_SITE_KEY` 위에 "운영 시 Enforce 필수" 주석 1줄 추가. 실제 `FIREBASE_CONFIG`/`APP_CHECK_SITE_KEY` 값과 `allow read, write: if true;` 예시 자체, JS 로직은 전혀 변경하지 않음(diff로 확인, 텍스트/주석 라인만 순수 추가).
- 영향 받는 함수: 없음 — `getFirestore()`, `isFirebaseConfigured()`, `firebaseStorageShim` 등 실제 동작 함수는 손대지 않았고 주석·정적 HTML 텍스트만 수정함.
- 검증 결과: 자동 스모크 체크(Chromium/Playwright, 샌드박스 내) 재실행 — 16개 탭 전부 `visible`, 탭 클릭으로 인한 신규 콘솔 에러 0건. 페이지 로딩 시점 에러(CDN 차단으로 인한 `ERR_TUNNEL_CONNECTION_FAILED` 8건 + 404 1건 + Firebase SDK 미로딩 1건)는 Phase 0 베이스라인과 **완전히 동일**하여 이번 변경으로 인한 신규 에러 없음을 확인. fbBanner 신규 문구가 서빙된 HTML에 정상 포함됨을 확인.
- 상태: 코드 동작 무변경 원칙 준수 확인됨. 다만 Phase 0의 사용자 수동 확인("BASELINE OK")은 여전히 PENDING.
