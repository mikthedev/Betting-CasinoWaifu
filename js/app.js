/**
 * app.js — balance + layout placement
 * Desktop: Yuki starts docked under the bet slip; dragging undocks her to float.
 * Phone: Yuki always floats.
 */
(function () {
  const bus = window.EventBus;

  let _balance = 1_000;
  let yukiFloated = false;
  const balanceEl = document.getElementById("balance");
  const yukiWidget = document.getElementById("yuki-widget");
  const yukiHost = document.getElementById("yuki-widget-host");
  const yukiDock = document.getElementById("yuki-desktop-dock");
  const betSlip = document.getElementById("bet-slip");
  const slipDock = document.getElementById("desktop-slip-dock");
  const sportsScreen = document.querySelector(".sports-screen");

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

  function isDesktopLayout() {
    return window.matchMedia("(min-width: 1100px)").matches;
  }

  function placeYuki() {
    if (!yukiWidget || !yukiHost) return;
    document.body.classList.add("yuki-overlay-mode", "casino-mode");
    if (yukiHost !== yukiWidget.parentElement) {
      yukiHost.appendChild(yukiWidget);
    }

    const desktop = isDesktopLayout();
    document.body.classList.toggle("desktop-layout", desktop);

    // Stay floating after the user has dragged her (or on phone).
    const shouldDock = desktop && yukiDock && !yukiFloated;

    if (shouldDock) {
      if (yukiDock !== yukiHost.parentElement) yukiDock.appendChild(yukiHost);
      yukiHost.classList.add("yuki-docked");
      yukiHost.style.left = "";
      yukiHost.style.top = "";
      yukiHost.style.right = "";
      yukiHost.style.bottom = "";
      yukiHost.style.width = "";
      yukiHost.style.height = "";
      yukiHost.style.maxWidth = "";
      yukiHost.style.position = "";
      yukiHost.style.zIndex = "";
      const panel = yukiHost.querySelector(".yuki-companion-panel");
      if (panel) {
        panel.style.width = "";
        panel.style.height = "";
        panel.style.aspectRatio = "";
        panel.style.maxWidth = "";
        panel.style.marginTop = "";
      }
    } else {
      if (document.body !== yukiHost.parentElement) document.body.appendChild(yukiHost);
      yukiHost.classList.remove("yuki-docked");
      if (!yukiHost.style.left && !yukiHost.style.top) {
        yukiHost.style.position = "fixed";
        yukiHost.style.right = "12px";
        yukiHost.style.bottom = desktop
          ? "24px"
          : "max(88px, calc(env(safe-area-inset-bottom, 0px) + 72px))";
        yukiHost.style.left = "auto";
        yukiHost.style.top = "auto";
        yukiHost.style.zIndex = "9999";
      }
    }
  }

  function placeBetSlip() {
    if (!betSlip) return;

    if (isDesktopLayout() && slipDock) {
      if (slipDock !== betSlip.parentElement) slipDock.appendChild(betSlip);
      betSlip.classList.add("desktop-slip", "open");
      return;
    }

    betSlip.classList.remove("desktop-slip");
    if (!sportsScreen) return;
    if (sportsScreen !== betSlip.parentElement) {
      const confirm = document.getElementById("yuki-confirm-slot");
      if (confirm && confirm.parentElement === sportsScreen) {
        confirm.insertAdjacentElement("afterend", betSlip);
      } else {
        sportsScreen.appendChild(betSlip);
      }
    }
  }

  function placeChrome() {
    placeYuki();
    placeBetSlip();
  }

  function init() {
    renderBalance();
    placeChrome();
    window.addEventListener("resize", placeChrome);
    bus && bus.emit("betting:ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.Betting = { getBalance, adjustBalance };
  window.YukiLayout = {
    setFloated(v) {
      yukiFloated = !!v;
    },
    isFloated: () => yukiFloated,
  };
})();
