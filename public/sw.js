/**
 * Service Worker - 푸시 알림 수신 및 처리 + 정적 에셋 캐싱
 * AI 펫톡의 하루 1회 인사 알림을 브라우저에서 표시
 * 정적 에셋 캐싱으로 반복 방문 시 로드 시간 단축
 */

const CACHE_NAME = "memento-v2";
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

// 이전 버전 캐시 정리
self.addEventListener("activate", function (event) {
    event.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(
                keys.filter(function (k) { return k !== CACHE_NAME; })
                    .map(function (k) { return caches.delete(k); })
            );
        })
    );
    self.clients.claim();
});

// 네트워크 요청 가로채기 - 정적 에셋/이미지 캐싱
self.addEventListener("fetch", function (event) {
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

    // Supabase Storage 이미지: Stale-While-Revalidate
    if (url.hostname.includes("supabase.co") && url.pathname.includes("/storage/")) {
        event.respondWith(
            caches.match(event.request).then(function (cached) {
                var fetchPromise = fetch(event.request).then(function (response) {
                    if (response.ok) {
                        var clone = response.clone();
                        caches.open(CACHE_NAME).then(function (cache) {
                            cache.put(event.request, clone);
                        });
                    }
                    return response;
                }).catch(function () {
                    return cached;
                });
                return cached || fetchPromise;
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
