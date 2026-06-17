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
  const MIN_TALKING_MS = 800;

  function isMobileOverlay() {
    return window.innerWidth <= 480;
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
    ui.ring     = document.getElementById("listen-ring");
    ui.charWrap = document.getElementById("yuki-char-wrap");
    ui.popup    = null; // no longer used (buttons are inline side elements)

    bindUI();
    wireEvents();
    bootVoice();
    setupMobileDrag();
  }

  function buildCompanion(mount) {
    mount.innerHTML = `
      <div class="yuki-root companion" id="yuki-root" data-emotion="idle">
        <div class="yuki-stage">
          <div class="yuki-toast" id="yuki-toast" role="status" aria-live="polite"></div>
          <div class="yuki-body">
            <div class="yuki-char-wrap" id="yuki-char-wrap">
              <div class="yuki-glow"></div>
              <div class="listen-ring" id="listen-ring"></div>
              <img class="yuki-char" id="yuki-char" src="${sprites.idle}" alt="Yuki" />
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
    mount.innerHTML = `
      <div class="yuki-root casino-widget" id="yuki-root" data-emotion="idle">
        <div class="yuki-stage">
          <div class="yuki-toast" id="yuki-toast" role="status" aria-live="polite"></div>

          <div class="yuki-row">
            <!-- Mute button — left side -->
            <button class="yuki-side-btn yuki-side-mute" id="btn-mute" aria-label="Mute Yuki">
              <span class="pop-icon">🔊</span>
            </button>

            <button type="button" class="yuki-body yuki-char-wrap yuki-tap-target" id="yuki-char-wrap" title="Tap Yuki to talk">
              <div class="yuki-glow"></div>
              <div class="listen-ring" id="listen-ring"></div>
              <img class="yuki-char" id="yuki-char" src="${sprites.idle}" alt="Yuki" draggable="false" />
            </button>

            <!-- Hide button — right side -->
            <button class="yuki-side-btn yuki-side-hide" id="btn-hide" aria-label="Hide Yuki">
              <span class="pop-icon">👁</span>
            </button>
          </div>
        </div>
      </div>`;
  }

  // ── Bind ─────────────────────────────────────────────────────────────────────
  function bindUI() {
    if (ui.talk) ui.talk.addEventListener("click", onTalk);

    if (ui.mute) {
      ui.mute.addEventListener("click", e => {
        e.stopPropagation(); // prevent bubbling to host drag/mini handler
        toggleMute();
      });
    }

    if (ui.hide) {
      ui.hide.addEventListener("click", e => {
        e.stopPropagation(); // critical: prevents host click from immediately un-hiding
        toggleHide();
      });
    }

    if (ui.charWrap && !isCompanion) {
      ui.charWrap.addEventListener("click", onCharTap);
    }
  }

  // ── Mobile drag ──────────────────────────────────────────────────────────────
  function setupMobileDrag() {
    const host = document.querySelector(".yuki-widget-host");
    if (!host) return;

    let sx = 0, sy = 0, sl = 0, st = 0, dragging = false;
    const THRESH = 6;

    function toAbsolute() {
      const r = host.getBoundingClientRect();
      host.style.right  = "auto";
      host.style.bottom = "auto";
      host.style.left   = r.left + "px";
      host.style.top    = r.top  + "px";
    }

    host.addEventListener("touchstart", e => {
      if (!isMobileOverlay()) return;
      const t = e.touches[0];
      sx = t.clientX; sy = t.clientY;
      const r = host.getBoundingClientRect();
      sl = r.left; st = r.top;
      dragging = false;
    }, { passive: true });

    host.addEventListener("touchmove", e => {
      if (!isMobileOverlay()) return;
      const t = e.touches[0];
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;

      if (!dragging && (Math.abs(dx) > THRESH || Math.abs(dy) > THRESH)) {
        dragging = true;
        toAbsolute();
      }

      if (!dragging) return;
      e.preventDefault();

      const maxL = window.innerWidth  - host.offsetWidth;
      const maxT = window.innerHeight - host.offsetHeight;
      host.style.left = Math.max(0, Math.min(maxL, sl + dx)) + "px";
      host.style.top  = Math.max(0, Math.min(maxT, st + dy)) + "px";
    }, { passive: false });

    host.addEventListener("touchend", () => { dragging = false; });

    // Tap on mini-badge restores Yuki (only direct tap on host, not bubbled)
    host.addEventListener("click", e => {
      if (e.target === host && host.classList.contains("yuki-mini")) {
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
      if (autoVoice && !userMuted) {
        initCasinoVoice();
        checkVoiceAvailability();
        startBettingIdle();
      }
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
      voiceActive = true;
      reconnectAttempt = 0;
      document.body.classList.add("voice-live");

      if (result.mic) {
        micEnabled = true;
        if (ui.charWrap) ui.charWrap.title = "Talking with Yuki";
        if (!isHidden && !inGameReaction()) setEmotion(E.LISTENING);
      } else if (result.needsGesture) {
        bindMicOnFirstGesture();
        if (ui.charWrap) ui.charWrap.title = "Tap anywhere to talk with Yuki";
        if (!isHidden && !inGameReaction()) setEmotion(E.HAPPY);
      } else if (ui.charWrap) {
        ui.charWrap.title = "Talking with Yuki";
      }
    } catch (err) {
      console.warn("[Widget] voice init failed:", err);
      scheduleReconnect();
    } finally {
      connecting = false;
    }
  }

  function bindMicOnFirstGesture() {
    if (micGestureBound || userMuted) return;
    micGestureBound = true;
    const finish = async () => {
      if (micEnabled || userMuted) return;
      connecting = true;
      try {
        await window.Voice.unlockAudio();
        await window.Voice.startSession();
        micEnabled = true;
        voiceActive = true;
        if (ui.charWrap) ui.charWrap.title = "Talking with Yuki";
        if (!isHidden && !inGameReaction()) setEmotion(E.LISTENING);
      } catch (err) {
        console.warn("[Widget] mic gesture start failed:", err);
      } finally {
        connecting = false;
      }
    };
    document.addEventListener("pointerdown", finish, { once: true, passive: true });
  }

  // ── Character tap ─────────────────────────────────────────────────────────────
  async function onCharTap() {
    // Voice activation
    if (isHidden || userMuted || connecting) return;
    connecting = true;
    setEmotion(E.LISTENING);
    try {
      await window.Voice.ensureRuntimeConfig();
      await window.Voice.startSession();
      micEnabled  = true;
      voiceActive = true;
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
      } else if (msg.includes("unreachable") || msg.includes("WebRTC") || msg.includes("Inworld")) {
        toast(msg.length > 70 ? msg.slice(0, 68) + "…" : msg, "info", 6000);
      } else {
        toast(msg.length > 60 ? msg.slice(0, 58) + "…" : msg, "info", 5000);
      }
    } finally {
      connecting = false;
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
      return;  // companion uses plain textContent (no .pop-icon spans)
    }

    userMuted = !userMuted;

    if (userMuted) {
      clearReconnect();
      window.Voice.disconnect();
      voiceActive = false;
      micEnabled  = false;
      document.body.classList.remove("voice-live");
      if (ui.mute) {
        const icon = ui.mute.querySelector(".pop-icon");
        if (icon) icon.textContent = "🔇";
        ui.mute.classList.add("is-muted");
      }
      setEmotion(E.IDLE);
      if (isHidden) toast("Yuki paused", "info", 2500);
    } else {
      if (ui.mute) {
        const icon = ui.mute.querySelector(".pop-icon");
        if (icon) icon.textContent = "🔊";
        ui.mute.classList.remove("is-muted");
      }
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
      isHidden = true;
      ui.root.classList.remove("yuki-pop");
      ui.root.classList.add("yuki-hidden");
      if (bar) bar.classList.add("is-collapsed");
      if (host && isMobileOverlay()) host.classList.add("yuki-mini");
      if (ui.hide) {
        const icon = ui.hide.querySelector(".pop-icon");
        if (icon) icon.textContent = "✦";
        ui.hide.classList.add("is-hidden-mode");
      }
      startTalkPrompt();
    } else {
      isHidden = false;
      ui.root.classList.remove("yuki-hidden");
      if (bar) bar.classList.remove("is-collapsed");
      if (host && isMobileOverlay()) host.classList.remove("yuki-mini");
      if (ui.hide) {
        const icon = ui.hide.querySelector(".pop-icon");
        if (icon) icon.textContent = "👁";
        ui.hide.classList.remove("is-hidden-mode");
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
    reactionUntil  = Date.now() + 3400;
    returnEmotion  = reaction.emotion;
    setEmotion(reaction.emotion);
    if (window.CharacterMemory) window.CharacterMemory.setMood(reaction.emotion);

    const canVoice  = !userMuted && voiceActive && window.Voice.isConnected();
    const inConvo   = canVoice && window.Voice.isInConversation?.();
    let voiceReacted = false;
    if (canVoice) {
      if (eventType === "IDLE") {
        voiceReacted = window.Voice.reactToGameEvent(eventType, payload);
      } else {
        voiceReacted = window.Voice.reactToGameEvent(eventType, payload);
      }
    }

    const skipToast = inConvo && eventType !== "IDLE";

    if (isHidden) {
      toast(eventType === "IDLE" ? "Talk to me" : reaction.line,
            eventType === "IDLE" ? "talk" : eventClass(eventType),
            3500);
    } else if (isCompanion) {
      toast(reaction.line, eventClass(eventType), 3500);
    } else if (eventType !== "IDLE" && !voiceReacted && !skipToast) {
      toast(reaction.line, eventClass(eventType), 2600);
    }

    if (!isHidden && eventType !== "IDLE" && (!inConvo || false)) nudge();
    if (eventType === "WIN" && !isHidden && !inConvo) burstConfetti();

    setTimeout(() => {
      if (inGameReaction()) return;
      if (ui.root.classList.contains("speaking")) setEmotion(E.TALKING);
      else if (ui.root.classList.contains("listening")) setEmotion(vibeListeningEmotion(userVibe));
      else if (Date.now() < sentimentEmotionUntil) return;
      else setEmotion(E.IDLE);
    }, 3400);
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
      if (connecting && !isHidden && !inGameReaction()) setEmotion(E.THINKING);
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
      if (!inGameReaction()) setEmotion(vibeListeningEmotion(userVibe));
    });
    bus.on("voice:listening:stop", () => {
      ui.root.classList.remove("listening");
      if (ui.ring) ui.ring.style.setProperty("--lvl", 0);
      if (!inGameReaction() && !ui.root.classList.contains("speaking")) restoreVoiceEmotion();
    });
    bus.on("voice:thinking:start", () => {
      if (!inGameReaction()) setEmotion(E.THINKING);
    });
    bus.on("voice:level", ({ level }) => {
      if (ui.ring) ui.ring.style.setProperty("--lvl", level.toFixed(3));
    });
    bus.on("voice:speaking:start", () => {
      talkingStartedAt = Date.now();
      ui.root.classList.add("speaking");
      if (!inGameReaction()) setEmotion(E.TALKING);
    });
    bus.on("voice:speaking:stop", () => {
      ui.root.classList.remove("speaking");
      if (inGameReaction()) return;
      if (Date.now() < sentimentEmotionUntil) return;
      const sinceStart = Date.now() - talkingStartedAt;
      const remaining = MIN_TALKING_MS - sinceStart;
      if (remaining > 0) {
        setTimeout(() => {
          if (!inGameReaction() && Date.now() >= sentimentEmotionUntil) restoreVoiceEmotion();
        }, remaining);
      } else {
        restoreVoiceEmotion();
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
          window.Sports.handleSwitchPlayerIntent();
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

        if (window.Sports.isConfirmIntent?.(t)) {
          window.Sports.handleConfirmIntent(t);
          return;
        }

        if (/\b(bet|pick|choose|want|go with|on|back)\b/.test(t)) {
          const unknown = window.Sports.findUnknownPlayerMention?.(t);
          if (unknown) {
            window.Sports.handleUnknownPlayerIntent(unknown);
            return;
          }
        }
        const isBestQuery  = /\b(best|recommend|top|who|suggest|favor|favourite|favorite|advise|should|performing|winning|good|strong)\b/.test(t);
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

  // ── Emotion / toast / effects ─────────────────────────────────────────────────
  function setEmotion(emotion) {
    if (!sprites[emotion]) emotion = E.IDLE;
    if (ui.char) ui.char.src = sprites[emotion];
    ui.root.dataset.emotion = emotion;
    returnEmotion = emotion;
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
