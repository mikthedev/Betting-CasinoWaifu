/**
 * widget.js — Yuki companion UI
 *
 * Casino modes:
 *   Visible — character + voice, no text bubbles
 *   Hidden  — text toasts only, styled by casino event
 *   Muted   — voice workflow paused until unmuted
 *
 * Mobile overlay: Yuki is a draggable fixed bubble.
 *   Tap Yuki → popup with Mute/Hide appears for 3.5s.
 *   Drag Yuki → repositions the bubble freely.
 */

(function () {
  const cfg = window.YUKI_CONFIG || {};
  const bus = window.EventBus;
  const sprites = (cfg.CHARACTER && cfg.CHARACTER.sprites) || {};
  const E = window.Character.EMOTION;
  const isCompanion = cfg.MODE === "companion";
  const avatar3d = !!cfg.AVATAR_3D;
  const autoVoice = !isCompanion && cfg.AUTO_VOICE !== false;

  const ui = {};
  let bubbleTimer     = null;
  let returnEmotion   = E.IDLE;
  let voiceActive     = false;
  let micEnabled      = false;
  let connecting      = false;
  let userMuted       = false;
  let isHidden        = false;
  let reconnectAttempt = 0;
  let reconnectTimer  = null;
  let idleTimer       = null;
  let talkPromptTimer = null;
  let reactionUntil   = 0;
  let userVibe        = "neutral";
  let talkingStartedAt = 0;
  let sentimentEmotionUntil = 0;
  let micGestureBound = false;
  let greetGesturePlayed = false;
  const MIN_TALKING_MS = 800;

  function isMobileOverlay() {
    // Floating Yuki on all non-desktop widths
    return window.innerWidth < 1100;
  }

  function inGameReaction() { return Date.now() < reactionUntil; }
  function getBar()          { return document.getElementById("yuki-widget"); }

  // ── Build ────────────────────────────────────────────────────────────────────
  function build() {
    const mount = document.getElementById("yuki-widget");
    if (!mount) return;

    if (isCompanion) {
      buildCompanion(mount);
    } else {
      buildCasinoWidget(mount);
    }

    ui.root     = document.getElementById("yuki-root");
    ui.char     = document.getElementById("yuki-char");
    ui.toast    = document.getElementById("yuki-toast");
    ui.talk     = document.getElementById("btn-talk");
    ui.mute     = document.getElementById("btn-mute");
    ui.hide     = document.getElementById("btn-hide");
    ui.restore  = document.getElementById("yuki-restore");
    ui.ring     = document.getElementById("listen-ring");
    ui.charWrap = document.getElementById("yuki-char-wrap");
    ui.popup    = null;

    bindUI();
    wireEvents();
    if (avatar3d) {
      document.body.classList.add("yuki-avatar-3d-mode");
      hide2dFallbackForever();
      bootAvatar3D();
    }
    bootVoice();
    setupMobileDrag();
  }

  function buildCompanion(mount) {
    const charMarkup = avatar3d
      ? `<img class="yuki-char yuki-char-fallback" id="yuki-char" src="${sprites.idle}" alt="" hidden />`
      : `<img class="yuki-char" id="yuki-char" src="${sprites.idle}" alt="Yuki" />`;
    mount.innerHTML = `
      <div class="yuki-root companion" id="yuki-root" data-emotion="idle">
        <div class="yuki-stage">
          <div class="yuki-toast" id="yuki-toast" role="status" aria-live="polite"></div>
          <div class="yuki-body">
            <div class="yuki-char-wrap" id="yuki-char-wrap">
              <div class="yuki-glow"></div>
              <div class="listen-ring" id="listen-ring"></div>
              ${charMarkup}
            </div>
          </div>
          <div class="yuki-controls">
            <button class="yc-btn talk" id="btn-talk"><span class="ic">🎤</span><span class="lbl">Talk</span></button>
            <button class="yc-btn mute" id="btn-mute" aria-label="Mute">🔊 Mute</button>
          </div>
        </div>
      </div>`;
  }

  function buildCasinoWidget(mount) {
    const charMarkup = avatar3d
      ? `<img class="yuki-char yuki-char-fallback" id="yuki-char" src="${sprites.idle}" alt="" draggable="false" hidden />`
      : `<img class="yuki-char" id="yuki-char" src="${sprites.idle}" alt="Yuki" draggable="false" />`;
    mount.innerHTML = `
      <div class="yuki-root casino-widget" id="yuki-root" data-emotion="idle">
        <div class="yuki-stage">
          <div class="yuki-companion-panel" id="yuki-row">
            <div class="yuki-toast" id="yuki-toast" role="status" aria-live="polite"></div>
            <div class="yuki-companion-glow" aria-hidden="true"></div>
            <div class="yuki-companion-toolbar">
              <button type="button" class="yuki-companion-btn" id="btn-mute" aria-label="Mute Yuki">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" stroke="none"/>
                  <path class="icon-wave" d="M15.54 8.46a5 5 0 010 7.07"/>
                  <path class="icon-slash" d="M17 7l4 4M21 7l-4 4"/>
                </svg>
              </button>
              <button type="button" class="yuki-companion-btn" id="btn-hide" aria-label="Minimize Yuki">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
            </div>
            <div class="yuki-companion-frame">
              <div class="yuki-companion-aurora" aria-hidden="true"></div>
              <div class="yuki-companion-viewport">
                <button type="button" class="yuki-char-wrap yuki-tap-target" id="yuki-char-wrap" title="Tap Yuki to talk">
                  <div class="yuki-glow"></div>
                  <div class="listen-ring" id="listen-ring"></div>
                  ${charMarkup}
                </button>
              </div>
            </div>
          </div>

          <button class="yuki-restore-pill" id="yuki-restore" type="button" aria-label="Show Yuki" hidden>
            <img class="yuki-restore-avatar" src="${sprites.idle}" alt="" />
            <span class="yuki-restore-label">Yuki</span>
          </button>
        </div>
      </div>`;
  }

  // ── Bind ─────────────────────────────────────────────────────────────────────
  function bindUI() {
    if (ui.talk) ui.talk.addEventListener("click", onTalk);

    if (ui.mute) {
      ui.mute.addEventListener("click", e => {
        e.stopPropagation();
        toggleMute();
      });
    }

    if (ui.hide) {
      ui.hide.addEventListener("click", e => {
        e.stopPropagation();
        toggleHide();
      });
    }

    if (ui.restore) {
      ui.restore.addEventListener("click", e => {
        e.stopPropagation();
        // Drag end fires a click — only restore on a real tap.
        if (suppressCharTap || didDragThisGesture) {
          e.preventDefault();
          suppressCharTap = false;
          didDragThisGesture = false;
          return;
        }
        if (isHidden) toggleHide();
      });
    }

    if (ui.charWrap && !isCompanion) {
      ui.charWrap.addEventListener("click", (e) => {
        // Drag end synthesizes a click — ignore those.
        if (suppressCharTap || didDragThisGesture) {
          e.preventDefault();
          e.stopPropagation();
          suppressCharTap = false;
          didDragThisGesture = false;
          return;
        }
        onCharTap();
      });
    }
  }

  // ── Floating drag (phone + desktop — undocks from aside when moved) ──────────
  let didDragThisGesture = false;
  let suppressCharTap = false;

  function clearYukiSizeLocks(host) {
    if (!host) return;
    host.style.removeProperty("width");
    host.style.removeProperty("height");
    host.style.removeProperty("max-width");
    const panel = host.querySelector(".yuki-companion-panel");
    if (panel) {
      panel.style.removeProperty("width");
      panel.style.removeProperty("height");
      panel.style.removeProperty("aspect-ratio");
      panel.style.removeProperty("max-width");
      panel.style.removeProperty("margin-top");
      panel.style.removeProperty("margin-bottom");
    }
  }

  function pinYukiHost(host, left, top) {
    if (!host) return;
    host.style.setProperty("position", "fixed", "important");
    host.style.setProperty("z-index", "9999", "important");
    host.style.setProperty("left", `${left}px`, "important");
    host.style.setProperty("top", `${top}px`, "important");
    host.style.setProperty("right", "auto", "important");
    host.style.setProperty("bottom", "auto", "important");
  }

  function setupMobileDrag() {
    const host = document.querySelector(".yuki-widget-host");
    if (!host) return;

    let sx = 0, sy = 0, sl = 0, st = 0, dragging = false;
    const THRESH = 8;

    function isMini() {
      return host.classList.contains("yuki-mini");
    }

    function visualEl() {
      // Mini: drag the restore pill. Docked: measure the panel, not the tall host.
      if (isMini()) return host.querySelector(".yuki-restore-pill") || host;
      return host.querySelector(".yuki-companion-panel") || host;
    }

    function undockForDrag() {
      if (!host.classList.contains("yuki-docked")) return;
      host.classList.remove("yuki-docked");
      if (host.parentElement !== document.body) {
        document.body.appendChild(host);
      }
      host.style.width = "";
      host.style.height = "auto";
      window.YukiLayout?.setFloated?.(true);
    }

    function pinHostAt(left, top) {
      pinYukiHost(host, left, top);
    }

    function lockFloatedSize(el, width, height) {
      const w = Math.round(width);
      const h = Math.round(height);
      host.style.setProperty("width", `${w}px`, "important");
      host.style.setProperty("height", "auto", "important");
      host.style.setProperty("max-width", "none", "important");
      // Only lock the companion panel when she's visible — never while minimized.
      if (!isMini() && el && el.classList?.contains("yuki-companion-panel")) {
        el.style.setProperty("width", `${w}px`, "important");
        el.style.setProperty("height", `${h}px`, "important");
        el.style.setProperty("aspect-ratio", "auto", "important");
        el.style.setProperty("max-width", "none", "important");
        el.style.setProperty("margin-top", "0", "important");
      }
    }

    function beginDrag(clientX, clientY) {
      const visualNode = visualEl();
      const visual = visualNode.getBoundingClientRect();
      const targetLeft = visual.left;
      const targetTop = visual.top;
      const lockW = visual.width;
      const lockH = visual.height;
      const mini = isMini();

      undockForDrag();

      if (mini) {
        // Host must shrink to the pill — leftover panel size locks cause the jump.
        clearYukiSizeLocks(host);
        host.style.setProperty("width", `${Math.round(lockW)}px`, "important");
        host.style.setProperty("height", `${Math.round(lockH)}px`, "important");
        host.style.setProperty("max-width", "none", "important");
      } else {
        lockFloatedSize(host.querySelector(".yuki-companion-panel"), lockW, lockH);
      }

      pinHostAt(targetLeft, targetTop);

      const after = host.getBoundingClientRect();
      if (Math.abs(after.left - targetLeft) > 0.5 || Math.abs(after.top - targetTop) > 0.5) {
        pinHostAt(targetLeft, targetTop);
      }

      sl = targetLeft;
      st = targetTop;
      sx = clientX;
      sy = clientY;

      host.classList.add("is-dragging");
      dragging = true;
      didDragThisGesture = true;
      suppressCharTap = true;
    }

    let gestureOnChar = false;
    let activePointerId = null;

    function onPointerDown(clientX, clientY, target) {
      // Mute/hide buttons only — restore pill is draggable when minimized.
      if (target?.closest?.(".yuki-companion-btn, #btn-mute, #btn-hide")) {
        return false;
      }
      sx = clientX;
      sy = clientY;
      const r = visualEl().getBoundingClientRect();
      sl = r.left;
      st = r.top;
      dragging = false;
      didDragThisGesture = false;
      // Capture only after drag starts — capturing on the host steals click from #yuki-char-wrap.
      gestureOnChar = !!target?.closest?.("#yuki-char-wrap, .yuki-tap-target");
      return true;
    }

    function onPointerMove(clientX, clientY, e) {
      if (!dragging) {
        const dx = clientX - sx;
        const dy = clientY - sy;
        if (Math.abs(dx) <= THRESH && Math.abs(dy) <= THRESH) return;
        beginDrag(clientX, clientY);
        // Capture only once dragging so the host keeps receiving moves off-element.
        if (activePointerId != null) {
          try { host.setPointerCapture?.(activePointerId); } catch (_) {}
        }
        e?.preventDefault?.();
        return;
      }

      e?.preventDefault?.();
      const dx = clientX - sx;
      const dy = clientY - sy;
      const maxL = Math.max(0, window.innerWidth - host.offsetWidth);
      const maxT = Math.max(0, window.innerHeight - host.offsetHeight);
      pinHostAt(
        Math.max(0, Math.min(maxL, sl + dx)),
        Math.max(0, Math.min(maxT, st + dy))
      );
    }

    function onPointerUp() {
      const wasDrag = didDragThisGesture;
      const wasCharTap = gestureOnChar && !wasDrag;
      if (wasDrag) {
        suppressCharTap = true;
        setTimeout(() => {
          suppressCharTap = false;
          didDragThisGesture = false;
        }, 80);
      }
      dragging = false;
      gestureOnChar = false;
      activePointerId = null;
      host.classList.remove("is-dragging");
      // Start voice on a clean char tap. (Host pointer-capture used to retarget click away from the button.)
      if (wasCharTap && !isCompanion) {
        onCharTap();
        // Ignore the synthetic click that follows pointerup.
        suppressCharTap = true;
        setTimeout(() => { suppressCharTap = false; }, 80);
      }
    }

    host.addEventListener("touchstart", e => {
      const t = e.touches[0];
      onPointerDown(t.clientX, t.clientY, e.target);
    }, { passive: true });

    host.addEventListener("touchmove", e => {
      const t = e.touches[0];
      onPointerMove(t.clientX, t.clientY, e);
    }, { passive: false });

    host.addEventListener("touchend", onPointerUp);
    host.addEventListener("touchcancel", onPointerUp);

    host.addEventListener("pointerdown", e => {
      if (e.pointerType === "touch") return;
      if (!onPointerDown(e.clientX, e.clientY, e.target)) return;
      activePointerId = e.pointerId;
      const move = ev => onPointerMove(ev.clientX, ev.clientY, ev);
      const up = () => {
        onPointerUp();
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    });

    host.addEventListener("click", e => {
      if (host.classList.contains("yuki-mini") && e.target.closest(".yuki-restore-pill")) {
        return;
      }
      if (e.target === host && host.classList.contains("yuki-mini")) {
        if (suppressCharTap || didDragThisGesture) return;
        toggleHide();
      }
    });
  }

  // ── Voice boot ───────────────────────────────────────────────────────────────
  async function bootVoice() {
    if (window.YUKI_loadRuntime) await window.YUKI_loadRuntime();
    if (isCompanion) {
      setEmotion(E.HAPPY);
      toast("Hey! Tap Talk~", "info", 4000);
      startCompanionIdle();
    } else {
      setEmotion(E.IDLE);
      if (ui.charWrap) ui.charWrap.title = "Tap Yuki to talk";
      startBettingIdle();
      checkVoiceAvailability();
    }
  }

  function voiceConfigHint(status) {
    if (window.YUKI_isVoiceConfigured?.()) return null;
    if (status?.mode === "webrtc" || status?.hasInworldKey) return null;
    return "Add INWORLD_API_KEY on Vercel → Settings → Environment Variables → redeploy";
  }

  async function checkVoiceAvailability() {
    if (!window.Voice?.checkVoiceServer) return;
    let config = {};
    if (window.YUKI_isHosted?.()) {
      try {
        const r = await fetch("/api/voice-config", { cache: "no-store" });
        if (r.ok) config = await r.json();
      } catch (_) {}
    }
    const status  = await window.Voice.checkVoiceServer();
    const hosted  = window.YUKI_isHosted?.() ?? false;
    const configured = window.YUKI_isVoiceConfigured?.() ?? !!config.voiceBackend;

    if (hosted && !configured) {
      toast(voiceConfigHint(config) || "Add INWORLD_API_KEY on Vercel, then redeploy", "info", 9000);
    } else if (hosted && configured && config.mode === "proxy" && !status.reachable) {
      toast("Voice server unreachable — check Railway is running", "info", 6000);
    } else if (!status.reachable && !hosted) {
      toast("Voice server offline — run npm start", "info", 5000);
    }
  }

  async function initCasinoVoice() {
    if (userMuted || connecting) return;
    if (window.YUKI_isHosted?.() && !window.YUKI_isVoiceConfigured?.()) return;
    if (micEnabled && window.Voice.isConnected()) return;

    connecting = true;
    if (!isHidden && !inGameReaction()) setEmotion(E.THINKING);

    try {
      await window.Voice.ensureRuntimeConfig();
      const result = await window.Voice.tryAutoStart();
      reconnectAttempt = 0;

      if (result.connected) {
        voiceActive = true;
        document.body.classList.add("voice-live");
        if (result.mic) {
          micEnabled = true;
          if (ui.charWrap) ui.charWrap.title = "Talking with Yuki";
          if (!isHidden && !inGameReaction()) setEmotion(E.LISTENING);
        } else if (result.needsGesture) {
          bindMicOnFirstGesture();
          if (ui.charWrap) ui.charWrap.title = "Tap Yuki to talk";
          if (!isHidden && !inGameReaction()) setEmotion(E.HAPPY);
        } else if (ui.charWrap) {
          ui.charWrap.title = "Talking with Yuki";
        }
      } else if (result.needsGesture) {
        bindMicOnFirstGesture();
        if (ui.charWrap) ui.charWrap.title = "Tap Yuki to talk";
        if (!isHidden && !inGameReaction()) setEmotion(E.HAPPY);
      } else {
        if (ui.charWrap) ui.charWrap.title = "Tap Yuki to talk";
        if (!isHidden && !inGameReaction()) setEmotion(E.IDLE);
      }
    } catch (err) {
      console.warn("[Widget] voice init failed:", err);
      if (ui.charWrap) ui.charWrap.title = "Tap Yuki to talk";
      if (!isHidden && !inGameReaction()) setEmotion(E.IDLE);
      scheduleReconnect();
    } finally {
      connecting = false;
    }
  }

  function bindMicOnFirstGesture() {
    if (micGestureBound || userMuted) return;
    micGestureBound = true;
    // Mic unlock must come from a real click on Yuki — not drag / random pointerdown.
    if (ui.charWrap) ui.charWrap.title = "Tap Yuki to talk";
  }

  // ── Character tap (click only — not after a drag) ─────────────────────────────
  let charTapInFlight = false;

  async function onCharTap() {
    if (suppressCharTap || didDragThisGesture) {
      suppressCharTap = false;
      didDragThisGesture = false;
      return;
    }
    // Voice activation — click/tap on Yuki only
    if (isHidden || userMuted || charTapInFlight) return;

    charTapInFlight = true;
    connecting = true;
    setEmotion(E.LISTENING);
    try {
      await window.Voice.ensureRuntimeConfig();
      await window.Voice.unlockAudio?.();
      if (!window.Voice.isConnected?.()) {
        await window.Voice.startSession();
      }
      const micOk = await window.Voice.requestMic?.();
      if (micOk !== false) {
        await window.Voice.attachMicCapture?.();
        micEnabled = true;
      }
      voiceActive = true;
      document.body.classList.add("voice-live");
      if (ui.charWrap) ui.charWrap.title = "Talking with Yuki";
    } catch (err) {
      console.warn("[Widget] char tap voice failed:", err);
      setEmotion(E.WORRIED);
      const hosted = window.YUKI_isHosted?.() ?? false;
      const msg    = String(err?.message || err);
      if (hosted && !window.YUKI_isVoiceConfigured?.()) {
        toast(voiceConfigHint() || "Add INWORLD_API_KEY on Vercel", "info", 7000);
      } else if (msg.includes("microphone")) {
        toast("Allow mic: click lock icon in address bar → Microphone", "info", 5500);
      } else if (msg.includes("INWORLD_API_KEY") || msg.includes("not configured")) {
        toast("Add INWORLD_API_KEY on Vercel → redeploy", "info", 6000);
      } else if (msg.includes("auth failed") || msg.includes("401") || msg.includes("403")) {
        toast("Voice auth failed — check INWORLD_API_KEY in .env", "info", 7000);
      } else if (msg.includes("unreachable") || msg.includes("WebRTC") || msg.includes("Inworld")) {
        toast(msg.length > 70 ? msg.slice(0, 68) + "…" : msg, "info", 6000);
      } else {
        toast(msg.length > 60 ? msg.slice(0, 58) + "…" : msg, "info", 5000);
      }
    } finally {
      connecting = false;
      charTapInFlight = false;
    }
  }

  async function enableMicSilently() {
    if (micEnabled || userMuted) return;
    const ok = await window.Voice.requestMic();
    if (!ok) return;
    await window.Voice.attachMicCapture();
    micEnabled = true;
    setEmotion(E.LISTENING);
  }

  // ── Mute / hide ──────────────────────────────────────────────────────────────
  function toggleMute() {
    if (isCompanion) {
      const muted = window.Voice.setMuted(!window.Voice.isMuted());
      if (ui.mute) {
        ui.mute.textContent = muted ? "🔇 Muted" : "🔊 Mute";
        ui.mute.classList.toggle("is-muted", muted);
      }
      return;
    }

    userMuted = !userMuted;

    if (userMuted) {
      clearReconnect();
      window.Voice.disconnect();
      voiceActive = false;
      micEnabled  = false;
      document.body.classList.remove("voice-live");
      ui.mute?.classList.add("is-muted");
      setEmotion(E.IDLE);
      if (isHidden) toast("Yuki paused", "info", 2500);
    } else {
      ui.mute?.classList.remove("is-muted");
      reconnectAttempt = 0;
      initCasinoVoice().then(async () => {
        if (!micEnabled) {
          await window.Voice.unlockAudio();
          const micOk = await window.Voice.requestMic();
          if (micOk) {
            await window.Voice.attachMicCapture();
            micEnabled = true;
            setEmotion(E.LISTENING);
          }
        }
      });
      if (isHidden) toast("Yuki back~", "info", 2500);
    }
  }

  function toggleHide() {
    const bar  = getBar();
    const host = document.querySelector(".yuki-widget-host");

    if (!isHidden) {
      // Capture where Yuki is now so the restore pill stays there (no teleport).
      const panel = host?.querySelector(".yuki-companion-panel");
      const anchor = (panel || host)?.getBoundingClientRect?.();

      isHidden = true;
      ui.root.classList.remove("yuki-pop");
      ui.root.classList.add("yuki-hidden");
      if (bar) bar.classList.add("is-collapsed");
      if (host) {
        // Undock so the pill can float freely (desktop dock would pin it in the aside).
        if (host.classList.contains("yuki-docked")) {
          host.classList.remove("yuki-docked");
          if (host.parentElement !== document.body) document.body.appendChild(host);
          window.YukiLayout?.setFloated?.(true);
        }
        host.classList.add("yuki-mini");
        // Drop full-panel size locks — they leave a giant invisible box and jump the pill.
        clearYukiSizeLocks(host);
      }
      ui.hide?.classList.add("is-hidden-mode");
      if (ui.restore) {
        ui.restore.hidden = false;
        ui.restore.classList.add("is-visible");
      }

      if (host && anchor) {
        requestAnimationFrame(() => {
          const pill = ui.restore?.getBoundingClientRect?.();
          const w = pill?.width || 120;
          const h = pill?.height || 44;
          host.style.setProperty("width", `${Math.round(w)}px`, "important");
          host.style.setProperty("height", `${Math.round(h)}px`, "important");
          // Keep the pill where Yuki was (top-left of her frame) — no teleport.
          const left = Math.max(0, Math.min(window.innerWidth - w, anchor.left));
          const top = Math.max(0, Math.min(window.innerHeight - h, anchor.top));
          pinYukiHost(host, left, top);
        });
      }

      startTalkPrompt();
    } else {
      isHidden = false;
      ui.root.classList.remove("yuki-hidden");
      if (bar) bar.classList.remove("is-collapsed");
      if (host) {
        host.classList.remove("yuki-mini");
        // Keep left/top; clear mini pill sizing so the panel can expand again.
        clearYukiSizeLocks(host);
      }
      ui.hide?.classList.remove("is-hidden-mode");
      if (ui.restore) {
        ui.restore.hidden = true;
        ui.restore.classList.remove("is-visible");
      }
      stopTalkPrompt();
      clearToast();

      ui.root.classList.add("yuki-pop");
      setEmotion(E.HAPPY);
      setTimeout(() => {
        ui.root.classList.remove("yuki-pop");
        setEmotion(voiceActive && micEnabled ? E.LISTENING : E.IDLE);
      }, 560);
    }
  }

  function startTalkPrompt() {
    stopTalkPrompt();
    if (!userMuted) toast("Talk to me", "talk", 8000);
    talkPromptTimer = setInterval(() => {
      if (isHidden && !userMuted) toast("Talk to me", "talk", 6000);
    }, 16000);
  }

  function stopTalkPrompt() {
    if (talkPromptTimer) clearInterval(talkPromptTimer);
    talkPromptTimer = null;
  }

  function scheduleReconnect() {
    if (userMuted || (voiceActive && micEnabled)) return;
    clearReconnect();
    const delay = Math.min(20000, 3000 + reconnectAttempt * 2000);
    reconnectAttempt += 1;
    reconnectTimer = setTimeout(() => initCasinoVoice(), delay);
  }

  function clearReconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  async function onTalk() {
    if (voiceActive && micEnabled) {
      userMuted = true;
      toggleMute();
      ui.talk.classList.remove("active");
      ui.talk.querySelector(".lbl").textContent = "Talk";
      return;
    }
    if (connecting) return;
    connecting = true;
    userMuted  = false;
    ui.talk.classList.add("active");
    ui.talk.disabled = true;
    setEmotion(E.THINKING);
    try {
      await window.Voice.unlockAudio();
      const micOk = await window.Voice.requestMic();
      if (!micOk) throw new Error("microphone-unavailable");
      await window.Voice.ensureSession();
      await window.Voice.attachMicCapture();
      voiceActive = true;
      micEnabled  = true;
      ui.talk.disabled = false;
      ui.talk.querySelector(".lbl").textContent = "End";
      setEmotion(E.LISTENING);
    } catch (_) {
      voiceActive = micEnabled = false;
      ui.talk.disabled = false;
      ui.talk.classList.remove("active");
      ui.talk.querySelector(".lbl").textContent = "Talk";
      setEmotion(E.WORRIED);
      toast("Allow mic in browser", "info", 4000);
    } finally {
      connecting = false;
    }
  }

  // ── Event wiring ─────────────────────────────────────────────────────────────
  function eventClass(type) {
    const wins  = new Set(["WIN"]);
    const loses = new Set(["LOSE"]);
    if (type === "TALK") return "talk";
    if (wins.has(type))  return "win";
    if (loses.has(type)) return "lose";
    return "info";
  }

  function vibeListeningEmotion(vibe) {
    const map = {
      sad: E.HAPPY, worried: E.HAPPY, playful: E.HAPPY,
      happy: E.HAPPY, excited: E.EXCITED, neutral: E.HAPPY,
    };
    return map[vibe] || E.HAPPY;
  }

  function applyUserVibe(vibe) {
    userVibe = vibe || "neutral";
    if (window.CharacterMemory) window.CharacterMemory.setUserVibe(userVibe);
    if (inGameReaction() || ui.root.classList.contains("speaking")) return;
    if (ui.root.classList.contains("listening")) {
      setEmotion(vibeListeningEmotion(userVibe));
    }
  }

  function applySentimentEmotion(emotion, midResponse) {
    const SENTIMENT_MAP = { worried: E.HAPPY, sad: E.HAPPY, excited: E.EXCITED, happy: E.HAPPY };
    const mapped = SENTIMENT_MAP[emotion];
    if (!mapped || inGameReaction()) return;
    if (midResponse) { setEmotion(mapped); return; }
    sentimentEmotionUntil = Date.now() + 6000;
    setEmotion(mapped);
    setTimeout(() => {
      if (Date.now() < sentimentEmotionUntil) return;
      if (inGameReaction() || ui.root.classList.contains("speaking")) return;
      if (ui.root.classList.contains("listening")) setEmotion(vibeListeningEmotion(userVibe));
      else setEmotion(E.IDLE);
    }, 6000);
  }

  function restoreVoiceEmotion() {
    if (inGameReaction()) return;
    if (Date.now() < sentimentEmotionUntil) return;
    if (ui.root.classList.contains("speaking")) setEmotion(E.TALKING);
    else if (ui.root.classList.contains("listening")) setEmotion(vibeListeningEmotion(userVibe));
    else setEmotion(E.IDLE);
  }

  function showReaction(reaction, eventType, payload = {}) {
    const isOutcome = eventType === "WIN" || eventType === "LOSE";
    reactionUntil  = Date.now() + (isOutcome ? 4800 : 3400);
    returnEmotion  = reaction.emotion;
    setEmotion(reaction.emotion);
    if (window.CharacterMemory) window.CharacterMemory.setMood(reaction.emotion);

    const canVoice  = !userMuted && voiceActive && window.Voice.isConnected();
    const inConvo   = canVoice && window.Voice.isInConversation?.();
    const inGrace   = window.Voice.isStartupGrace?.();
    let voiceReacted = false;
    if (canVoice && !(eventType === "IDLE" && inGrace)) {
      voiceReacted = window.Voice.reactToGameEvent(eventType, payload);
    }

    const skipToast = inConvo && eventType !== "IDLE" && !isOutcome;

    if (isHidden) {
      toast(eventType === "IDLE" ? "Talk to me" : reaction.line,
            eventType === "IDLE" ? "talk" : eventClass(eventType),
            3500);
    } else if (isCompanion) {
      toast(reaction.line, eventClass(eventType), 3500);
    } else if (eventType !== "IDLE" && (!voiceReacted || isOutcome) && !skipToast) {
      toast(reaction.line, eventClass(eventType), isOutcome ? 3200 : 2600);
    }

    if (!isHidden && isOutcome) nudge();
    if (eventType === "WIN" && !isHidden) burstConfetti();

    setTimeout(() => {
      if (inGameReaction()) return;
      if (ui.root.classList.contains("speaking")) setEmotion(E.TALKING);
      else if (ui.root.classList.contains("listening")) setEmotion(vibeListeningEmotion(userVibe));
      else if (Date.now() < sentimentEmotionUntil) return;
      else setEmotion(E.IDLE);
    }, isOutcome ? 4800 : 3400);
  }

  function wireEvents() {
    bus.on("sports:event", ({ type, payload }) => {
      const key = type === "WIN" ? "WIN" : "LOSE";
      if (window.CharacterMemory) window.CharacterMemory.recordOutcome(key, payload);
      showReaction(window.Character.reactToOutcome(key, payload), key, payload);
    });

    bus.on("widget:reaction", ({ reaction, type, payload }) => {
      showReaction(reaction, type, payload);
    });

    bus.on("voice:connecting", () => {
      // Keep "listening" if the user just tapped — don't flash thinking over it.
      if (charTapInFlight || isHidden || inGameReaction()) return;
      if (connecting) setEmotion(E.THINKING);
    });
    bus.on("voice:ready", () => {
      connecting = false; voiceActive = true; reconnectAttempt = 0;
      document.body.classList.add("voice-live");
      if (ui.charWrap && !micEnabled) ui.charWrap.title = "Tap Yuki to speak";
      if (micEnabled && !isHidden && !inGameReaction()) setEmotion(E.LISTENING);
    });
    bus.on("voice:closed", () => {
      voiceActive = micEnabled = connecting = false;
      document.body.classList.remove("voice-live");
      if (!userMuted && autoVoice) scheduleReconnect();
      else if (!isHidden) setEmotion(E.IDLE);
    });
    bus.on("voice:error", ({ message }) => {
      connecting = false;
      if (!userMuted && autoVoice) scheduleReconnect();
      const msg    = message || "Voice unavailable";
      const hosted = window.YUKI_isHosted?.() ?? false;
      if (msg.includes("not configured") || msg.includes("VOICE_BACKEND")) {
        toast(voiceConfigHint() || "Voice not configured", "info", 7000);
      } else if (hosted && (msg.includes("unreachable") || msg.includes("closed") || msg.includes("timed out"))) {
        toast("Voice server offline — check Railway deploy", "info", 6000);
      } else if (msg.includes("unreachable") || msg.includes("closed") || msg.includes("timed out")) {
        toast("Voice server offline — run npm start locally", "info", 5000);
      } else {
        toast(msg, "info", 4000);
      }
    });
    bus.on("voice:listening:start", () => {
      ui.root.classList.add("listening");
      if (!inGameReaction()) setEmotion(avatar3d ? E.LISTENING : vibeListeningEmotion(userVibe));
      syncAvatar();
    });
    bus.on("voice:listening:stop", () => {
      ui.root.classList.remove("listening");
      if (ui.ring) ui.ring.style.setProperty("--lvl", 0);
      if (!inGameReaction() && !ui.root.classList.contains("speaking")) restoreVoiceEmotion();
      syncAvatar();
    });
    bus.on("voice:thinking:start", () => {
      if (!inGameReaction()) setEmotion(E.THINKING);
      syncAvatar();
    });
    bus.on("voice:level", ({ level }) => {
      if (ui.ring) ui.ring.style.setProperty("--lvl", level.toFixed(3));
    });
    bus.on("voice:speaking:start", () => {
      talkingStartedAt = Date.now();
      ui.root.classList.add("speaking");
      setAvatarSpeaking(true);
      if (avatar3d && !greetGesturePlayed && window.YukiAvatar3D) {
        greetGesturePlayed = true;
        window.YukiAvatar3D?.playGesture?.("hello");
      }
      if (!inGameReaction()) setEmotion(E.TALKING);
      syncAvatar();
    });
    bus.on("voice:speaking:stop", () => {
      ui.root.classList.remove("speaking");
      setAvatarSpeaking(false);
      if (inGameReaction()) return;
      if (Date.now() < sentimentEmotionUntil) return;
      const sinceStart = Date.now() - talkingStartedAt;
      const remaining = MIN_TALKING_MS - sinceStart;
      if (remaining > 0) {
        setTimeout(() => {
          if (!inGameReaction() && Date.now() >= sentimentEmotionUntil) restoreVoiceEmotion();
          syncAvatar();
        }, remaining);
      } else {
        restoreVoiceEmotion();
        syncAvatar();
      }
    });

    bus.on("voice:sentiment", ({ emotion, midResponse }) => {
      applySentimentEmotion(emotion, midResponse);
    });

    bus.on("voice:vibe", ({ vibe }) => {
      applyUserVibe(vibe);
    });

    bus.on("voice:transcript", ({ text, role, partial } = {}) => {
      if (partial || role !== "user" || !text || isCompanion) return;
      const t = text.toLowerCase();

      if (window.Sports) {
        const tournament = window.Sports.findTournamentBySpeech?.(t);
        if (tournament && window.Sports.isTournamentNavIntent?.(t)) {
          window.Sports.handleTournamentIntent(tournament);
          return;
        }

        if (window.Sports.isPickStrategyIntent?.(t) && !window.Sports.hasUserPlayerLock?.()) {
          window.Sports.handlePickIntent(t);
          return;
        }

        if (window.Sports.isSwitchPlayerIntent?.(t)) {
          window.Sports.handleSwitchPlayerIntent(t);
          return;
        }

        if (window.Sports.isShowPlayerIntent?.(t)) {
          window.Sports.handleShowPlayerIntent(t);
          return;
        }

        if (window.Sports.handleVoicePlayerIntent?.(t)) {
          return;
        }

        if (window.Sports.isStakeIntent?.(t)) {
          window.Sports.handleStakeIntent(t);
          return;
        }

        if (window.Sports.isFillSlipIntent?.(t) && window.Sports.canFillSlip?.(t)) {
          window.Sports.handleConfirmIntent(t);
          return;
        }

        if (window.Sports.isSlipConfirmPhrase?.(t) || window.Sports.isConfirmIntent?.(t)) {
          window.Sports.handleConfirmIntent(t);
          return;
        }

        if (window.VoiceBetting?.detectConsentTrigger?.(t) || window.VoiceBetting?.detectPlaceBetCommand?.(t)) {
          const handled = window.VoiceBetting.handleUserSpeech(t);
          if (handled.needsConsent) {
            window.VoiceBetting.requestDelegateConsent();
            return;
          }
          if (handled.executed || handled.hint) return;
        }

        if (/\b(bet|pick|choose|want|go with|on|back)\b/.test(t)) {
          const unknown = window.Sports.findUnknownPlayerMention?.(t);
          if (unknown) {
            window.Sports.handleUnknownPlayerIntent(unknown);
            return;
          }
        }
        const isBestQuery  = /\b(best|recommend|top|who|suggest|favor|favourite|favorite|advise|should|performing|winning|good|strong|character)\b/.test(t);
        const wantsRecommendation = isBestQuery
          || /\b(recommend|suggestion|who should|best pick|top pick|your pick)\b/.test(t);
        if (wantsRecommendation && !window.Sports.hasUserPlayerLock?.()) {
          window.Sports.handlePickIntent(t);
          return;
        }
      }

      const hasBetWord  = /\b(bet|betting|wager|place a bet|tennis|wimbledon|player)\b/.test(t);
      const hasNegation = /\b(no|don't|not|cancel|stop)\b/.test(t);
      if (hasBetWord && !hasNegation && window.Sports) {
        window.Sports.handleBetIntent();
      }
    });

    bus.on("voice:mic:denied", ({ code }) => {
      micEnabled = false; setEmotion(E.WORRIED);
      if (code === "denied") {
        toast("Mic blocked — allow in browser site settings", "info", 6000);
      } else if (code === "insecure") {
        toast("Mic needs HTTPS or localhost", "info", 4000);
      } else {
        toast("Mic unavailable — check browser permissions", "info", 4500);
      }
    });
    bus.on("voice:mic:granted", () => { micEnabled = true; });
    bus.on("voice:mic:streaming", () => {
      micEnabled = connecting = false;
      if (!isHidden && !inGameReaction()) setEmotion(E.LISTENING);
    });
  }

  // ── Companion idle ────────────────────────────────────────────────────────────
  function startIdleCheckIns() {
    const ms = (cfg.EVENT_SYSTEM && cfg.EVENT_SYSTEM.idleTimeoutMs) || 22000;
    const canShowIdle = () => {
      if (inGameReaction()) return false;
      if (Date.now() < sentimentEmotionUntil) return false;
      if (ui.root?.classList.contains("speaking")) return false;
      if (ui.root?.classList.contains("listening")) return false;
      if (Date.now() - talkingStartedAt < 3000) return false;
      if (window.Voice?.isInConversation?.()) return false;
      if (window.Voice?.isStartupGrace?.()) return false;
      const current = ui.root?.dataset?.emotion;
      if (current && current !== E.IDLE && current !== E.HAPPY) return false;
      return true;
    };
    const tick = () => {
      if (voiceActive && canShowIdle()) {
        nudge();
        showReaction(window.Character.reactToOutcome("IDLE"), "IDLE");
      }
      idleTimer = setTimeout(tick, ms);
    };
    idleTimer = setTimeout(tick, ms);
  }

  function startCompanionIdle() { startIdleCheckIns(); }
  function startBettingIdle()   { startIdleCheckIns(); }

  // ── 3D avatar ────────────────────────────────────────────────────────────────
  function hide2dFallbackForever() {
    if (!avatar3d) return;
    document.body.classList.add("yuki-avatar-3d-mode");
    if (ui.char) {
      ui.char.hidden = true;
      ui.char.setAttribute("hidden", "");
      ui.char.removeAttribute("src");
      ui.char.alt = "";
    }
  }

  function getAvatarModelUrl() {
    const a = cfg.AVATAR_3D;
    if (!a) return "assets/vrm/yuki_street.vrm";
    if (typeof a === "string") return a;
    return a.modelUrl || a.skins?.[0]?.url || "assets/vrm/yuki_street.vrm";
  }

  function bootAvatar3D() {
    if (!avatar3d || !ui.charWrap) return;
    if (ui.charWrap.classList.contains("yuki-avatar-3d-loading")) return;
    ui.charWrap.classList.add("yuki-avatar-3d-loading");
    const modelUrl = getAvatarModelUrl();
    const framing = "compact";
    import(`/js/yuki-avatar-3d.js?v=4`)
      .then(({ mountYukiAvatar3D }) => mountYukiAvatar3D(ui.charWrap, { modelUrl, framing }))
      .then((avatar) => {
        window.YukiAvatar3D = avatar;
        document.body.classList.add("yuki-avatar-3d-ready");
        ui.charWrap.classList.remove("yuki-avatar-3d-loading");
        hide2dFallbackForever();
        syncAvatar();
      })
      .catch((err) => {
        console.warn("[YukiAvatar3D] mount failed — keeping 2D fallback:", err);
        ui.charWrap.classList.remove("yuki-avatar-3d-loading");
        if (ui.char) {
          ui.char.hidden = false;
          ui.char.removeAttribute("hidden");
          ui.char.src = sprites.idle;
          ui.char.alt = "Yuki";
        }
        document.body.classList.remove("yuki-avatar-3d-mode");
      });
  }

  function setAvatarSpeaking(on) {
    if (!avatar3d) return;
    window.YukiAvatar3D?.setSpeaking?.(on);
  }

  function setAvatarMood(mood) {
    if (!avatar3d) return;
    window.YukiAvatar3D?.setMood?.(mood);
  }

  function syncAvatar() {
    if (!avatar3d || !window.YukiAvatar3D) return;
    let mode = "idle";
    const audioPlaying = window.Voice?.isAgentAudioPlaying?.();
    if (ui.root?.classList.contains("speaking") || audioPlaying) mode = "speaking";
    else if (ui.root?.classList.contains("listening")) mode = "listening";
    else if (ui.root?.dataset?.emotion === "thinking") mode = "thinking";
    window.YukiAvatar3D.setMode?.(mode);
  }

  // ── Emotion / toast / effects ─────────────────────────────────────────────────
  function setEmotion(emotion) {
    if (!sprites[emotion]) emotion = E.IDLE;
    if (ui.char && !avatar3d) ui.char.src = sprites[emotion];
    ui.root.dataset.emotion = emotion;
    returnEmotion = emotion;

    if (avatar3d) {
      const moodMap = {
        happy: "happy", excited: "excited", sad: "sad", worried: "worried",
        idle: "neutral", listening: null, thinking: null, talking: null,
      };
      if (moodMap[emotion]) setAvatarMood(moodMap[emotion]);
      syncAvatar();
    }
  }

  function toast(text, kind = "info", ms = 3500) {
    if (!ui.toast) return;
    clearTimeout(bubbleTimer);
    const short = text.length > 48 ? text.slice(0, 46).trim() + "…" : text;
    ui.toast.textContent = short;
    ui.toast.className   = "yuki-toast show event-" + kind;
    bubbleTimer = setTimeout(clearToast, ms);
  }

  function clearToast() {
    if (!ui.toast) return;
    ui.toast.classList.remove("show");
  }

  function nudge() {
    if (!ui.charWrap || isHidden) return;
    ui.charWrap.classList.remove("nudge");
    void ui.charWrap.offsetWidth;
    ui.charWrap.classList.add("nudge");
  }

  function burstConfetti() {
    if (!ui.charWrap) return;
    const layer  = document.createElement("div");
    layer.className = "confetti-layer";
    const colors = ["#7ad7ff","#ffd166","#ff7ab6","#9b8cff","#7CFFB2"];
    for (let i = 0; i < 24; i++) {
      const c = document.createElement("i");
      c.style.left = Math.random() * 100 + "%";
      c.style.background = colors[i % colors.length];
      c.style.animationDelay = Math.random() * 0.4 + "s";
      layer.appendChild(c);
    }
    ui.charWrap.appendChild(layer);
    setTimeout(() => layer.remove(), 2200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
