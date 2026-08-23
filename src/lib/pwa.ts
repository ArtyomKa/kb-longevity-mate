const SW_PATH = "/sw.js";

function isBlockedContext() {
  if (!import.meta.env.PROD) return true;
  if (typeof window === "undefined") return true;
  if (window.self !== window.top) return true;
  const host = window.location.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return true;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return true;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return true;
  if (new URLSearchParams(window.location.search).has("sw")) {
    return new URLSearchParams(window.location.search).get("sw") === "off";
  }
  return false;
}

async function unregisterAppWorkers() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    regs
      .filter((r) => (r.active?.scriptURL ?? r.installing?.scriptURL ?? "").endsWith(SW_PATH))
      .map((r) => r.unregister()),
  );
}

export function setupPwa() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (isBlockedContext()) {
    void unregisterAppWorkers();
    return;
  }
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(SW_PATH, { scope: "/" }).catch(() => undefined);
  });
}
