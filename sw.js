// 최소 서비스워커: 설치 가능하게 만드는 용도 + 오프라인일 때 마지막으로 열었던 화면 보여주기
// Firebase 등 다른 요청은 건드리지 않고 그대로 통과시킵니다(항상 최신 데이터).
const CACHE = 'dw-shell-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.add('/')));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // 앱 껍데기(HTML 문서)만 네트워크 우선 + 오프라인 폴백으로 캐싱하고,
  // 그 외 요청(Firebase, API 등)은 서비스워커가 관여하지 않습니다.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          caches.open(CACHE).then((c) => c.put('/', res.clone()));
          return res;
        })
        .catch(() => caches.match('/'))
    );
  }
});
