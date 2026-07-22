/**
 * app-version.js — visible release badge (same idea as Interactive CasinoWaifu casino-version.js)
 * Keep in sync with asset-versions.json + package.json when you ship.
 */
window.APP_VERSION = {
  version: "1.1.0",
  label: "World Cup 2026",
  date: "2026-07-22",
  commitLabel: "minimize-pill-drag + phone bracket + companion framing",
};

(function () {
  function paint() {
    const v = window.APP_VERSION || { version: "0.0.0" };
    const host = location.hostname;
    const local = host === "localhost" || host === "127.0.0.1" || host === "[::1]";
    const el = document.getElementById("app-version");
    if (!el) return;
    el.textContent = `v${v.version}`;
    el.title = [
      v.label || "Betting CasinoWaifu",
      v.commitLabel || "",
      v.date || "",
      local ? "local" : "vercel",
    ].filter(Boolean).join(" · ");
    el.classList.toggle("is-local", local);
    el.hidden = false;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", paint);
  } else {
    paint();
  }
})();
