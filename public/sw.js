// TradeAI Service Worker v1.0
const CACHE_NAME = "tradeai-v1";
const ASSETS_TO_CACHE = ["/", "/index.html"];

// Instala o service worker
self.addEventListener("install", (event) => {
  console.log("SW: Instalando...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// Ativa o service worker
self.addEventListener("activate", (event) => {
  console.log("SW: Ativado!");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Intercepta requisições (cache first para assets estáticos)
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.url.includes("/api/")) return; // não cacheia API
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

// Recebe mensagens do app para mostrar notificações
self.addEventListener("message", (event) => {
  if (event.data?.type === "SHOW_NOTIFICATION") {
    const { title, body, icon, tag, data } = event.data.payload;
    self.registration.showNotification(title, {
      body,
      icon: icon || "/logo192.png",
      badge: "/logo192.png",
      tag: tag || "tradeai",
      data: data || {},
      vibrate: [200, 100, 200],
      requireInteraction: false,
      actions: [
        { action: "abrir", title: "📱 Abrir App" },
        { action: "fechar", title: "✕ Fechar" },
      ],
    });
  }
});

// Click na notificação — abre o app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "fechar") return;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("daytrade-ai") && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow("/");
    })
  );
});
