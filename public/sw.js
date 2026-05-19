const CACHE_NAME = "mes-factory-v3";
const STATIC_ASSETS = [
  "/",
  "/login",
  "/manifest.json",
];

// 安装：预缓存核心页面
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// 请求策略：
// - HTML/navigation：network-first（优先网络，离线用缓存）
// - API 请求：network-only（不缓存，报工提交必须实时）
// - 静态资源（JS/CSS/图片）：cache-first（优先缓存）
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非 GET 请求和 chrome-extension
  if (request.method !== "GET" || url.protocol.startsWith("chrome")) {
    return;
  }

  // API 请求：直接走网络，不缓存
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: "网络不可用，请稍后重试" }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        );
      })
    );
    return;
  }

  // 导航请求（HTML 页面）：network-first
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 缓存成功的页面响应
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return cached || caches.match("/");
          });
        })
    );
    return;
  }

  // 静态资源：network-first（优先用最新代码，避免缓存旧版本）
  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg")
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }
});

// 监听离线同步消息
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SYNC_OFFLINE") {
    // 通知所有客户端执行离线同步
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: "DO_SYNC" });
      });
    });
  }
});
