/**
 * Service Worker - 푸시 알림 수신 및 처리 + 정적 에셋 캐싱
 * AI 펫톡의 하루 1회 인사 알림을 브라우저에서 표시
 * 정적 에셋 캐싱으로 반복 방문 시 로드 시간 단축
 */

const CACHE_NAME = "memento-v5-img-networkfirst";
const STATIC_ASSETS = ["/logo.png", "/logo2.png", "/icon-192.png", "/icon-512.png"];

// 서비스 워커 설치 시 정적 에셋 프리캐시
self.addEventListener("install", function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// 페이지에서 보낸 SKIP_WAITING 메시지 처리 → 새 SW 즉시 활성화
self.addEventListener("message", function (event) {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});

// 이전 버전 캐시 정리 + 모든 클라이언트 강제 새로고침 (PWA 자동번역 차단 메타 적용 보장)
self.addEventListener("activate", function (event) {
    event.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(
                keys.filter(function (k) { return k !== CACHE_NAME; })
                    .map(function (k) { return caches.delete(k); })
            );
        }).then(function () {
            return self.clients.claim();
        }).then(function () {
            // 새 SW 버전 활성화 시 PWA standalone 창 포함 모든 클라이언트 강제 새로고침
            return self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (cs) {
                cs.forEach(function (client) {
                    try { client.navigate(client.url); } catch (e) { /* noop */ }
                });
            });
        })
    );
});

// 네트워크 요청 가로채기 - 정적 에셋/이미지 캐싱
self.addEventListener("fetch", function (event) {
    // GET 요청만 캐싱 가능 (Cache API는 POST/PUT/DELETE 지원 안 함)
    // POST 업로드는 서비스 워커가 건드리지 않고 브라우저 기본 동작에 맡김
    if (event.request.method !== "GET") {
        return;
    }

    var url = new URL(event.request.url);

    // API 요청은 캐싱하지 않음
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/data/")) {
        return;
    }

    // HTML 내비게이션 요청은 캐싱하지 않음 (항상 최신 페이지)
    if (event.request.mode === "navigate") {
        return;
    }

    // 폰트, 아이콘, 로고: Cache First
    if (
        url.pathname.startsWith("/fonts/") ||
        url.pathname.startsWith("/icons/") ||
        STATIC_ASSETS.indexOf(url.pathname) !== -1
    ) {
        event.respondWith(
            caches.match(event.request).then(function (cached) {
                if (cached) return cached;
                return fetch(event.request).then(function (response) {
                    if (response.ok) {
                        var clone = response.clone();
                        caches.open(CACHE_NAME).then(function (cache) {
                            cache.put(event.request, clone);
                        });
                    }
                    return response;
                });
            })
        );
        return;
    }

    // Supabase Storage 이미지: Network-First (GET만)
    // 이전엔 Stale-While-Revalidate라 수정된 이미지(같은 URL 덮어쓰기)가 캐시본으로 잠깐 보였다 교체됨.
    // → 항상 최신을 먼저 받고, 네트워크 실패(오프라인) 시에만 캐시 폴백. stale-flash 제거.
    if (url.hostname.includes("supabase.co") && url.pathname.includes("/storage/")) {
        event.respondWith(
            fetch(event.request).then(function (response) {
                if (response.ok) {
                    var clone = response.clone();
                    caches.open(CACHE_NAME).then(function (cache) {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            }).catch(function () {
                return caches.match(event.request).then(function (cached) {
                    return cached || Response.error();
                });
            })
        );
        return;
    }
});

// 푸시 메시지 수신 시 알림 표시
self.addEventListener("push", function (event) {
    if (!event.data) return;

    var data;
    try {
        data = event.data.json();
    } catch (e) {
        data = { title: "메멘토애니", body: event.data.text() };
    }

    var options = {
        body: data.body || "",
        icon: data.icon || "/logo.png",
        badge: "/logo.png",
        tag: "daily-greeting",
        renotify: true,
        vibrate: [200, 100, 200],
        data: {
            url: data.url || "/?tab=ai-chat",
        },
    };

    event.waitUntil(
        self.registration.showNotification(
            data.title || "메멘토애니",
            options,
        ),
    );
});

// 알림 클릭 시 앱 열기
self.addEventListener("notificationclick", function (event) {
    event.notification.close();

    var url = event.notification.data?.url || "/?tab=ai-chat";

    event.waitUntil(
        clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then(function (windowClients) {
                for (var i = 0; i < windowClients.length; i++) {
                    var client = windowClients[i];
                    if (client.url.includes(self.location.origin)) {
                        client.navigate(url);
                        return client.focus();
                    }
                }
                return clients.openWindow(url);
            }),
    );
});
