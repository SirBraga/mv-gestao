// Service Worker — Push Notifications
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "Nova notificação", body: event.data.text(), url: "/dashboard" };
  }

  const options = {
    body: data.body || "",
    icon: "/root/logo.png",
    badge: "/root/logo.png",
    tag: data.tag || "mvgestao-notif",
    renotify: true,
    data: { url: data.url || "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(data.title || "MV Gestão", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
