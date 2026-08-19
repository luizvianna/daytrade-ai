// TradeAI Service Worker v2 — corrige o HTML travando em cache de versão antiga.
// Antes: cache-first pra tudo, inclusive pro index.html. Isso fazia o app nunca
// atualizar sozinho pra quem já tinha visitado antes, porque o navegador só
// reinstala o Service Worker quando este arquivo (sw.js) muda — e o index.html
// cacheado (que aponta pro nome do bundle JS) nunca era renovado.
// Agora: HTML/navegação sempre busca a rede primeiro (cache só como reserva
// pra quando estiver offline); arquivos com hash no nome (JS/CSS do build)
// continuam cache-first, porque esses são seguros — o nome muda sempre que
// o conteúdo muda.
const CACHE_NAME = "tradeai-v2";
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

// Intercepta requisições
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.url.includes("/api/")) return; // não cacheia API

  const url = new URL(event.request.url);
  const isNavegacao =
    event.request.mode === "navigate" ||
    url.pathname === "/" ||
    url.pathname === "/index.html";

  if (isNavegacao) {
    // Rede primeiro — garante que a pessoa sempre vê o deploy mais recente.
    // Cache só entra em jogo se a rede falhar (ex: sem internet).
    event.respondWith(
      fetch(event.request)
        .then((resposta) => {
          const copia = resposta.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
          return resposta;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Assets com hash no nome (JS/CSS/imagens do build) — cache-first é seguro
  // aqui, porque o nome do arquivo muda sempre que o conteúdo muda.
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
