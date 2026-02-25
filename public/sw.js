/**
 * Service Worker - 푸시 알림 수신 및 처리
 * AI 펫톡의 하루 1회 인사 알림을 브라우저에서 표시
 */

// 푸시 메시지 수신 시 알림 표시
self.addEventListener("push", function (event) {
    if (!event.data) return;

    let data;
    try {
        data = event.data.json();
    } catch (e) {
        data = { title: "메멘토애니", body: event.data.text() };
    }

    const options = {
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

    const url = event.notification.data?.url || "/?tab=ai-chat";

    event.waitUntil(
        clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then(function (windowClients) {
                for (const client of windowClients) {
                    if (client.url.includes(self.location.origin)) {
                        client.navigate(url);
                        return client.focus();
                    }
                }
                return clients.openWindow(url);
            }),
    );
});
