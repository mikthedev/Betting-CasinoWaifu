/**
 * app.js — shared balance + Yuki slot placement for tennis betting
 *
 * Exposes window.Betting:
 *   Betting.getBalance()
 *   Betting.adjustBalance(delta) → returns new balance, emits "betting:balance"
 */
(function () {
  const bus = window.EventBus;

  let _balance = 1_000;
  const balanceEl = document.getElementById("balance");
  const yukiWidget = document.getElementById("yuki-widget");
  const yukiSlot = document.getElementById("yuki-slot");

  function renderBalance() {
    if (balanceEl) balanceEl.textContent = _balance.toLocaleString();
  }

  function getBalance() {
    return _balance;
  }

  function adjustBalance(delta) {
    _balance = Math.max(0, _balance + delta);
    renderBalance();
    bus && bus.emit("betting:balance", { balance: _balance, delta });
    return _balance;
  }

  function isMobileViewport() {
    return window.matchMedia("(max-width: 480px)").matches;
  }

  function placeYuki() {
    if (!yukiWidget) return;

    if (isMobileViewport()) {
      document.body.classList.add("yuki-overlay-mode");
      return;
    }

    document.body.classList.remove("yuki-overlay-mode");
    if (yukiSlot && yukiSlot !== yukiWidget.parentElement) {
      yukiSlot.appendChild(yukiWidget);
    }
  }

  function init() {
    renderBalance();
    placeYuki();
    window.addEventListener("resize", placeYuki);
    bus && bus.emit("betting:ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.Betting = { getBalance, adjustBalance };
})();
