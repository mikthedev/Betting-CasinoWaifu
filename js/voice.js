/**
 * voice.js — Inworld Realtime speech-to-speech (no browser TTS)
 * -----------------------------------------------------------------------------
 * Connects to the local WebSocket proxy (server/index.js), which forwards to
 * Inworld's Realtime API. Handles mic capture, PCM16 streaming, and agent audio
 * playback.
 *
 * Public API:
 *   Voice.connect()              start voice session (mic + WebSocket)
 *   Voice.disconnect()           end session
 *   Voice.toggleSession()        connect / disconnect
 *   Voice.isConnected()
 *   Voice.setMuted(bool)         mute agent audio output only
 *   Voice.isMuted()
 *   Voice.notifyGameEvent(type, payload)  inject roulette context (silent)
 *
 * EventBus events:
 *   voice:connecting / voice:ready / voice:closed / voice:error
 *   voice:listening:start / voice:listening:stop
 *   voice:thinking:start / voice:thinking:stop
 *   voice:speaking:start / voice:speaking:stop
 *   voice:transcript  { text, role }
 *   voice:sentiment   { emotion, midResponse? }
 *   voice:vibe        { vibe, previous? }
 *   voice:level  { level }
 *   voice:muted  { muted }
 */

(function () {
  const cfg = window.YUKI_CONFIG || {};
  const bus = window.EventBus;
  const SAMPLE_RATE = 24000;
  const CHUNK_MS = 80;

  let ws = null;
  let transport = "ws"; // "ws" | "webrtc"
  let pc = null;
  let dc = null;
  let remoteAudioEl = null;
  let voiceGainNode = null;
  let voiceOutputVolume = (cfg.VOICE && cfg.VOICE.volume) ?? 1;
  let connected = false;
  let sessionReady = false;
  let muted = false;
  let micStream = null;
  let captureCtx = null;
  let playbackCtx = null;
  let processor = null;
  let analyser = null;
  let levelRAF = null;
  let agentSpeaking = false;
  let userSpeaking = false;
  let currentResponseText = "";
  let audioUnlocked = false;
  let greetingSent = false;
  let connectPromise = null;
  let webrtcCfg = null;

  // Scheduled playback nodes for interrupt support
  let scheduledSources = [];
  let nextPlayTime = 0;

  // Deferred speaking-stop for WebSocket path
  let speakingStopTimer = null;

  // WebRTC: level-driven speaking state (driven by actual remote audio RMS)
  let remoteAnalyser = null;
  let remoteAnalyserSrc = null;
  let webrtcLevelWatcher = null;
  let webrtcAgentTalking = false;

  // Interaction priority — conversation beats small wins
  let lastUserSpeechAt = 0;
  let lastAgentSpeechEndAt = 0;
  let lastSilencePromptAt = 0;
  let lastOutcomeVoiceAt = 0;
  let silenceTimer = null;
  let conversationVibe = "happy";

  const HUGE_EVENTS = new Set([]);
  const OUTCOME_EVENTS = new Set(["WIN", "LOSE"]);
  const AMBIENT_EVENTS = new Set(["IDLE"]);

  const emit = (name, data) => bus && bus.emit(name, data);

  function conversationGraceMs() {
    const base = cfg.EVENT_SYSTEM?.conversationGraceMs ?? 18000;
    if (conversationVibe === "sad" || conversationVibe === "worried") {
      return cfg.EVENT_SYSTEM?.deepConversationGraceMs ?? 28000;
    }
    return base;
  }

  function agentSpeechGraceMs() {
    return cfg.EVENT_SYSTEM?.agentSpeechGraceMs ?? 9000;
  }

  function outcomeVoiceCooldownMs() {
    return cfg.EVENT_SYSTEM?.outcomeVoiceCooldownMs ?? 10000;
  }

  function isDeepConversation() {
    return conversationVibe === "sad" || conversationVibe === "worried";
  }

  function getConversationVibe() {
    return conversationVibe;
  }

  function isInConversation() {
    const now = Date.now();
    if (userSpeaking || agentSpeaking) return true;
    if (lastUserSpeechAt && now - lastUserSpeechAt < conversationGraceMs()) return true;
    if (lastAgentSpeechEndAt && now - lastAgentSpeechEndAt < agentSpeechGraceMs()) return true;
    return false;
  }

  function isHugeEvent(type) {
    return HUGE_EVENTS.has(type);
  }

  function injectUserPrompt(text) {
    if (!isTransportOpen() || !sessionReady || muted) return false;
    if (agentSpeaking) {
      interruptPlayback();
      if (isTransportOpen()) sendJson({ type: "response.cancel" });
    }
    userSpeaking = false;
    sendJson({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text }],
      },
    });
    sendJson({ type: "response.create" });
    return true;
  }

  function startSilenceWatcher() {
    stopSilenceWatcher();
    const tickMs = 5000;
    silenceTimer = setInterval(() => {
      if (!sessionReady || muted || agentSpeaking || userSpeaking) return;
      if (isInConversation()) return;
      const now = Date.now();
      const userQuiet = !lastUserSpeechAt || now - lastUserSpeechAt >= (cfg.EVENT_SYSTEM?.userSilenceMs ?? 20000);
      const yukiQuiet = !lastAgentSpeechEndAt || now - lastAgentSpeechEndAt >= 14000;
      const promptGap = now - lastSilencePromptAt >= (cfg.EVENT_SYSTEM?.silencePromptCooldownMs ?? 55000);
      if (userQuiet && yukiQuiet && promptGap) {
        promptSilenceBreak();
      }
    }, tickMs);
  }

  function stopSilenceWatcher() {
    if (silenceTimer) {
      clearInterval(silenceTimer);
      silenceTimer = null;
    }
  }

  function promptSilenceBreak() {
    if (!isTransportOpen() || muted || isInConversation()) return false;
    lastSilencePromptAt = Date.now();

    const promptsByVibe = {
      sad: [
        "[Quiet moment. They were down earlier — one warm beat, then something cozy or fun to lift the mood. Upbeat, not somber. Max 12 words.]",
        "[Still hanging out. Playful or cozy check-in — find the fun angle. Max 12 words.]",
      ],
      worried: [
        "[They seemed stressed. Reassure with a smile — light, optimistic, maybe a tiny joke. Max 12 words.]",
        "[Quiet at the betting screen. Upbeat 'we got this' energy — warm, not heavy. Max 12 words.]",
      ],
      playful: [
        "[Quiet moment. Playful nudge — tease lightly or wonder what they're thinking. Max 12 words.]",
        "[They went silent. Something fun and curious — keep it light. Max 12 words.]",
      ],
      happy: [
        "[Quiet moment. Warm curious question — their day, a game, music, anything fun. Max 12 words.]",
        "[Still hanging out. Wonder what they're up to — cozy and curious. Max 12 words.]",
      ],
      excited: [
        "[Quiet after some hype. Keep energy up but ask something genuine. Max 12 words.]",
      ],
      neutral: [
        "[It's been quiet. Bright, playful question — their day, a game, anime, music, anything fun. Max 12 words.]",
        "[Quiet moment at the tennis betting screen. Tease lightly or wonder what match they're eyeing — upbeat, not needy. Max 12 words.]",
        "[They went silent. Something fun and curious — keep your smile on. Max 12 words.]",
        "[Still here together. Wonder who they'd bet on next — warm and excited. Max 12 words.]",
      ],
    };

    const pool = promptsByVibe[conversationVibe] || promptsByVibe.neutral;
    return injectUserPrompt(pool[Math.floor(Math.random() * pool.length)]);
  }

  function promptIdleConversation() {
    if (!isTransportOpen() || muted || isInConversation()) return false;
    const now = Date.now();
    if (now - lastSilencePromptAt < (cfg.EVENT_SYSTEM?.silencePromptCooldownMs ?? 55000)) return false;
    lastSilencePromptAt = now;

    const idleByVibe = {
      sad: "[Player is idle. Upbeat cozy opener — something fun to lift the vibe. Max 12 words.]",
      worried: "[Player is idle. Cheerful check-in — warm optimism, light energy. Max 12 words.]",
      playful: "[Player is idle. Playful tennis betting question to start chatting. Max 12 words.]",
      happy: "[Player is idle. Bright curious question — favorite player, tournament, or something fun. Max 12 words.]",
      excited: "[Player is idle. Hyped question to start a chat. Max 12 words.]",
      neutral: "[Player is idle at the tennis betting screen. Bright friendly question — a match, player, anime, music, anything fun. Max 12 words.]",
    };

    return injectUserPrompt(idleByVibe[conversationVibe] || idleByVibe.neutral);
  }

  function emitSpeakingStop() {
    if (speakingStopTimer) {
      clearTimeout(speakingStopTimer);
      speakingStopTimer = null;
    }
    emit("voice:speaking:stop");
    emit("voice:thinking:stop");
    if (!userSpeaking) emit("voice:listening:stop");
    lastAgentSpeechEndAt = Date.now();
  }

  function deferSpeakingStopWS() {
    if (!playbackCtx || nextPlayTime <= playbackCtx.currentTime) {
      emitSpeakingStop();
      return;
    }
    const delayMs = Math.ceil((nextPlayTime - playbackCtx.currentTime) * 1000) + 200;
    speakingStopTimer = setTimeout(emitSpeakingStop, delayMs);
  }

  function estimateSpeakDuration(text) {
    const words = (text || "").trim().split(/\s+/).filter(Boolean).length;
    const WPM = 155;
    const base = words > 0 ? Math.ceil((words / WPM) * 60 * 1000) : 3000;
    return Math.max(base + 1000, 2000);
  }

  function startWebRTCLevelWatcher() {
    stopWebRTCLevelWatcher();
    if (!remoteAnalyser) return;

    if (playbackCtx && playbackCtx.state === "suspended") {
      playbackCtx.resume().catch(() => {});
    }

    const data = new Uint8Array(remoteAnalyser.frequencyBinCount);
    const RISE_RMS = 3;
    const MAX_WAIT = 8000;
    const startedAt = Date.now();

    webrtcLevelWatcher = setInterval(() => {
      if (!remoteAnalyser) {
        stopWebRTCLevelWatcher();
        return;
      }

      if (!webrtcAgentTalking && Date.now() - startedAt > MAX_WAIT) {
        stopWebRTCLevelWatcher();
        return;
      }

      if (webrtcAgentTalking) {
        stopWebRTCLevelWatcher();
        return;
      }

      remoteAnalyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const d = data[i] - 128;
        sum += d * d;
      }
      const rms = Math.sqrt(sum / data.length);

      if (rms > RISE_RMS) {
        webrtcAgentTalking = true;
        agentSpeaking = true;
        emit("voice:thinking:stop");
        emit("voice:speaking:start");
        stopWebRTCLevelWatcher();
      }
    }, 50);
  }

  function scheduleSpeakingStop(text) {
    if (speakingStopTimer) {
      clearTimeout(speakingStopTimer);
      speakingStopTimer = null;
    }
    const delayMs = estimateSpeakDuration(text);
    speakingStopTimer = setTimeout(() => {
      webrtcAgentTalking = false;
      agentSpeaking = false;
      emitSpeakingStop();
    }, delayMs);
  }

  function stopWebRTCLevelWatcher() {
    if (webrtcLevelWatcher) {
      clearInterval(webrtcLevelWatcher);
      webrtcLevelWatcher = null;
    }
  }

  /** Lightweight keyword sentiment for Yuki's spoken response text — bias toward upbeat sprites. */
  function detectSentiment(text) {
    const t = (text || "").toLowerCase();

    if (/\b(haha|hehe|lol|lmao|heehee|aha+ha|bwaha|pfft|teehee|giggl|snort)\b|ha{3,}|he{3,}/.test(t))
      return "excited";

    if (/\b(jackpot|huge|incredible|insane|omg|oh my god|oh my gosh|amazing|unbelievable|massive|epic|legendary|woah|wow|no way|eee+|yess+|let'?s go|i can'?t believe|that'?s insane|so good|so cool|blown away|mind.?blown)\b/.test(t))
      return "excited";

    if (/\b(yay|nice|great|awesome|good job|well done|congrats|congratulations|love (it|that|this|you)|happy|fun|exciting|cool|sweet|fantastic|beautiful|brilliant|wonderful|proud|so proud|love that|good for you|that'?s great|next one|we got this|you got this|almost|so close|unlucky)\b/.test(t))
      return "happy";

    if (/\b(sorry|that (sucks|hurts)|hang in there|rough time|that'?s rough|oh no|poor (you|thing)|i'?m here|aww+)\b/.test(t))
      return "happy";

    return null;
  }

  /** Detect emotional vibe from the player's speech for tone mirroring. */
  function detectUserVibe(text) {
    const t = (text || "").toLowerCase();
    if (!t.trim()) return null;

    if (/\b(depressed|devastated|heartbroken|grief|cried|crying|hopeless|miserable|awful day|worst day|so sad|really sad|lonely|passed away|died|funeral|broke up|breakup|lost my job|fired|feel (empty|lost|numb)|can't stop thinking|miss (him|her|them|you)|i miss)\b/.test(t))
      return "sad";

    if (/\b(worried|nervous|anxious|stressed|overwhelmed|exhausted|scared|afraid|panic|frustrated|upset|angry|mad at|hard time|struggling|tough|difficult|ugh+|rough day|bad day|feel (bad|down|low))\b/.test(t))
      return "worried";

    if (/\b(haha|hehe|lol|lmao|teehee|you're funny|silly|just kidding|jk|tease|pfft)\b|ha{3,}/.test(t))
      return "playful";

    if (/\b(wow|omg|insane|incredible|no way|let's go|yess+|eee+|hype|amazing|unbelievable)\b/.test(t))
      return "excited";

    if (/\b(good|great|nice|fine|okay|ok|pretty good|not bad|chill|relaxed|better|happy|fun|love it|awesome|yay)\b/.test(t))
      return "happy";

    return null;
  }

  function updateConversationVibe(text) {
    const detected = detectUserVibe(text);
    if (!detected) return conversationVibe;

    const heavy = conversationVibe === "sad" || conversationVibe === "worried";
    const light = detected === "happy" || detected === "excited" || detected === "playful";

    if (detected === "sad" || detected === "worried") {
      conversationVibe = detected;
    } else if (light || !heavy) {
      conversationVibe = detected;
    }

    return conversationVibe;
  }

  const VIBE_HINTS = {
    sad: "Player tone: a little down. One brief warm beat — then cozy positivity or a fun distraction. Stay upbeat; do not get somber or tearful.",
    worried: "Player tone: stressed. Reassure with a smile — optimistic, light, maybe gentle humor. No heavy sympathy.",
    playful: "Player tone: playful. Grin energy — tease lightly, keep it fun.",
    happy: "Player tone: happy. Match and amplify — bright, warm, excited.",
    excited: "Player tone: hyped. Match their energy — celebrate!",
    neutral: "Player tone: casual. Your default sunshine energy — bright, curious, fun.",
  };

  function notifyVibeShift(vibe) {
    if (!isTransportOpen() || !sessionReady) return;
    const hint = VIBE_HINTS[vibe] || VIBE_HINTS.neutral;
    sendJson({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "system",
        content: [{ type: "input_text", text: hint }],
      },
    });
  }

  function handleUserTranscript(text) {
    if (!text) return;
    lastUserSpeechAt = Date.now();
    const prevVibe = conversationVibe;
    const vibe = updateConversationVibe(text);
    if (vibe !== prevVibe) {
      notifyVibeShift(vibe);
      emit("voice:vibe", { vibe, previous: prevVibe });
      if (window.CharacterMemory) window.CharacterMemory.setUserVibe(vibe);
    }
    if (window.CharacterMemory) window.CharacterMemory.addTurn("user", text);
  }

  function handleYukiTranscript(text) {
    if (!text) return;
    if (window.CharacterMemory) window.CharacterMemory.addTurn("yuki", text);
  }

  function backendWsUrl(base) {
    if (!base) return null;
    const wsBase = base.replace(/^https:/i, "wss:").replace(/^http:/i, "ws:").replace(/\/$/, "");
    return `${wsBase}/realtime`;
  }

  function wsUrl() {
    const rt = window.YUKI_RUNTIME || {};
    if (rt.wsUrl) return rt.wsUrl;
    if (rt.voiceBackendUrl) return backendWsUrl(rt.voiceBackendUrl);

    if (cfg.REALTIME && cfg.REALTIME.wsUrl) return cfg.REALTIME.wsUrl;

    const voicePort = Number(cfg.REALTIME?.port) || 8787;
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    const pagePort = window.location.port ? Number(window.location.port) : null;

    // Preview servers (8123, 5500, etc.) serve static files only — voice proxy is on REALTIME.port
    const local =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "[::1]" ||
      /^192\.168\./.test(host) ||
      /^10\./.test(host);
    const onVoicePort = pagePort === voicePort || pagePort === 80 || pagePort === 443;

    if (local && pagePort && !onVoicePort) {
      return `${proto}//${host}:${voicePort}/realtime`;
    }

    // Same-origin only works with `npm start` (Node serves static + WS). Vercel cannot proxy WS.
    if (local || !window.location.protocol.startsWith("http")) {
      return `${proto}//${window.location.host}/realtime`;
    }

    return null;
  }

  function voiceServerHealthUrl() {
    const rt = window.YUKI_RUNTIME || {};
    if (rt.voiceBackendUrl) {
      return `${rt.voiceBackendUrl.replace(/\/$/, "")}/health`;
    }

    const voicePort = Number(cfg.REALTIME?.port) || 8787;
    const host = window.location.hostname;
    const pagePort = window.location.port ? Number(window.location.port) : null;
    const voiceOnSameHost =
      !pagePort || pagePort === voicePort || pagePort === 80 || pagePort === 443;
    const base = voiceOnSameHost
      ? `${window.location.protocol}//${window.location.host}`
      : `${window.location.protocol}//${host}:${voicePort}`;
    return `${base}/health`;
  }

  function isVoiceConfigured() {
    return window.YUKI_isVoiceConfigured?.() ?? !!(wsUrl());
  }

  async function ensureRuntimeConfig() {
    if (window.YUKI_loadRuntime) await window.YUKI_loadRuntime();
  }

  function useWebRTC() {
    if (window.YUKI_isLocalHost?.()) return false;
    const rt = window.YUKI_RUNTIME || {};
    if (rt.mode === "webrtc") return true;
    if (rt.mode === "proxy") return false;
    return !!(rt.hasInworldKey && !rt.wsUrl);
  }

  function sendJson(obj) {
    const text = JSON.stringify(obj);
    if (transport === "webrtc") {
      if (dc?.readyState === "open") dc.send(text);
    } else if (ws?.readyState === WebSocket.OPEN) {
      ws.send(text);
    }
  }

  function isTransportOpen() {
    if (transport === "webrtc") return dc?.readyState === "open";
    return ws?.readyState === WebSocket.OPEN;
  }

  function waitForIceComplete(peer, maxMs = 2000) {
    if (peer.iceGatheringState === "complete") return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => {
        if (peer.iceGatheringState === "complete") {
          peer.removeEventListener("icegatheringstatechange", done);
          resolve();
        }
      };
      peer.addEventListener("icegatheringstatechange", done);
      setTimeout(resolve, maxMs);
    });
  }

  async function fetchWebRTCConfig() {
    const cfgRes = await fetch("/api/webrtc-config", { cache: "no-store" });
    if (!cfgRes.ok) {
      const err = await cfgRes.json().catch(() => ({}));
      throw new Error(err.error || "Voice API not configured — set INWORLD_API_KEY on Vercel");
    }
    webrtcCfg = await cfgRes.json();
    return webrtcCfg;
  }

  async function signalWebRTC(cfgData) {
    const res = await fetch(cfgData.callsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/sdp",
        Authorization: `Bearer ${cfgData.token}`,
      },
      body: pc.localDescription.sdp,
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Inworld WebRTC failed (${res.status}): ${t.slice(0, 120)}`);
    }
    await pc.setRemoteDescription({ type: "answer", sdp: await res.text() });
  }

  // ---------------------------------------------------------------------------
  // WebRTC session (Vercel — browser connects direct to Inworld, no Railway)
  // ---------------------------------------------------------------------------
  async function connectWebRTC(options = {}) {
    const withMic = options.withMic !== false;

    if (connected && sessionReady) {
      if (withMic && micStream) await attachWebRTCMic();
      return;
    }

    cleanupTransport();
    transport = "webrtc";
    emit("voice:connecting");

    const cfgData = webrtcCfg || (await fetchWebRTCConfig());
    console.info("[Voice] WebRTC", withMic ? "connect" : "warm");

    if (withMic && !micStream) {
      const micOk = await requestMic();
      if (!micOk) throw new Error("microphone-unavailable");
      await unlockAudio();
    }

    return new Promise((resolve, reject) => {
      let settled = false;
      let timeoutId = setTimeout(() => {
        if (!settled) fail("Connection timed out");
      }, 22000);

      const succeed = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        resolve();
      };
      const fail = (msg) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        cleanupTransport();
        emit("voice:error", { message: msg });
        reject(new Error(msg));
      };

      pc = new RTCPeerConnection({ iceServers: cfgData.ice_servers || [] });
      dc = pc.createDataChannel("oai-events", { ordered: true });

      if (withMic && micStream) {
        micStream.getAudioTracks().forEach((t) => pc.addTrack(t, micStream));
      }

      pc.ontrack = (e) => {
        if (!remoteAudioEl) {
          remoteAudioEl = document.createElement("audio");
          remoteAudioEl.autoplay = true;
          remoteAudioEl.playsInline = true;
          remoteAudioEl.setAttribute("playsinline", "");
          document.body.appendChild(remoteAudioEl);
        }
        const remoteStream = new MediaStream([e.track]);
        remoteAudioEl.srcObject = remoteStream;
        remoteAudioEl.volume = getVoiceVolume();
        if (remoteAudioEl.paused) remoteAudioEl.play().catch(() => {});

        try {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          if (Ctx) {
            if (!playbackCtx) playbackCtx = new Ctx({ latencyHint: "playback" });
            remoteAnalyserSrc = playbackCtx.createMediaStreamSource(remoteStream);
            remoteAnalyser = playbackCtx.createAnalyser();
            remoteAnalyser.fftSize = 256;
            remoteAnalyserSrc.connect(remoteAnalyser);
          }
        } catch (_) {}
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") fail("WebRTC connection failed");
      };

      dc.onopen = () => {
        connected = true;
        if (withMic) audioUnlocked = true;
      };

      dc.onmessage = (ev) => {
        let msg;
        try {
          msg = JSON.parse(ev.data);
        } catch (_) {
          return;
        }
        if (cfg.EVENT_SYSTEM?.debug) console.log("[Voice] ←", msg.type);
        handleServerMessage(msg, succeed, fail);
      };

      dc.onclose = () => {
        if (!settled && !sessionReady) fail("WebRTC data channel closed");
      };

      (async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await waitForIceComplete(pc);
          await signalWebRTC(cfgData);
        } catch (err) {
          fail(err.message || "WebRTC setup failed");
        }
      })();
    });
  }

  async function attachWebRTCMic() {
    if (!micStream || !pc) return false;
    await unlockAudio();

    const hasAudio = pc.getSenders().some((s) => s.track?.kind === "audio");
    if (!hasAudio) {
      micStream.getAudioTracks().forEach((t) => pc.addTrack(t, micStream));
      const cfgData = webrtcCfg || (await fetchWebRTCConfig());
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIceComplete(pc);
      await signalWebRTC(cfgData);
    }

    micStream.getAudioTracks().forEach((t) => {
      t.enabled = true;
    });
    emit("voice:mic:streaming");
    return true;
  }

  // ---------------------------------------------------------------------------
  // WebSocket session (local npm start or legacy Railway proxy)
  // ---------------------------------------------------------------------------
  function connectWs() {
    if (connected && sessionReady) return Promise.resolve();
    cleanupTransport();
    transport = "ws";
    return new Promise((resolve, reject) => {
      let settled = false;
      let timeoutId = null;

      const succeed = () => {
        if (settled) return;
        settled = true;
        if (timeoutId) clearTimeout(timeoutId);
        resolve();
      };
      const fail = (msg) => {
        if (settled) return;
        settled = true;
        if (timeoutId) clearTimeout(timeoutId);
        cleanupTransport();
        emit("voice:error", { message: msg });
        reject(new Error(msg));
      };

      emit("voice:connecting");
      if (window.location.protocol === "file:") {
        fail("Open via npm start at http://localhost:8787 — voice does not work from file://");
        return;
      }
      const url = wsUrl();
      if (!url) {
        fail("Voice not configured — set INWORLD_API_KEY on Vercel or run npm start locally");
        return;
      }
      console.info("[Voice] connecting to", url);
      ws = new WebSocket(url);

      ws.onopen = () => {
        connected = true;
      };

      ws.onmessage = (ev) => {
        let msg;
        try {
          msg = JSON.parse(ev.data);
        } catch (_) {
          return;
        }
        if (cfg.EVENT_SYSTEM?.debug) console.log("[Voice] ←", msg.type);
        handleServerMessage(msg, succeed, fail);
      };

      ws.onerror = () => fail(`Voice server unreachable (${url})`);
      ws.onclose = (ev) => {
        const wasLive = sessionReady;
        cleanupTransport();
        if (wasLive) emit("voice:closed");
        cleanupSession(false);
        if (!settled) {
          const detail = ev.code ? ` code ${ev.code}` : "";
          fail(`Voice connection closed${detail}`);
        }
      };

      timeoutId = setTimeout(() => {
        if (!settled) fail("Connection timed out");
      }, 20000);
    });
  }

  function connect() {
    if (connected && sessionReady) return Promise.resolve();
    if (connectPromise) return connectPromise;

    connectPromise = ensureRuntimeConfig()
      .then(() => {
        if (useWebRTC()) return connectWebRTC({ withMic: false });
        transport = "ws";
        return connectWs();
      })
      .finally(() => {
        connectPromise = null;
      });

    return connectPromise;
  }

  async function handleServerMessage(msg, onReady, onFail) {
    switch (msg.type) {
      case "error":
        onFail(msg.error?.message || "Inworld error");
        break;

      case "session.created":
        sendJson(window.YUKI_SESSION_UPDATE || buildDefaultSessionUpdate());
        break;

      case "session.updated":
        sessionReady = true;
        emit("voice:ready");
        resumeMicPipeline();
        maybeStartConversation();
        startSilenceWatcher();
        onReady();
        break;

      case "input_audio_buffer.speech_started":
        userSpeaking = true;
        lastUserSpeechAt = Date.now();
        interruptPlayback();
        if (isTransportOpen()) {
          sendJson({ type: "response.cancel" });
        }
        emit("voice:listening:start");
        emit("voice:thinking:stop");
        break;

      case "input_audio_buffer.committed":
        userSpeaking = false;
        emit("voice:listening:stop");
        emit("voice:thinking:start");
        break;

      case "response.created":
        currentResponseText = "";
        if (transport === "webrtc") {
          emit("voice:thinking:start");
          startWebRTCLevelWatcher();
        }
        break;

      case "response.output_audio.delta":
        if (transport === "webrtc") break;
        if (!agentSpeaking) {
          agentSpeaking = true;
          currentResponseText = "";
          emit("voice:thinking:stop");
          emit("voice:transcript:reset");
          emit("voice:speaking:start");
        }
        const audioB64 = msg.delta || msg.audio;
        if (!muted && audioB64) playAudioDelta(audioB64);
        break;

      case "response.output_audio_transcript.delta":
      case "response.output_text.delta":
        if (msg.delta) {
          currentResponseText += msg.delta;
          emit("voice:transcript", { text: msg.delta, role: "yuki", partial: true });
          const midSentiment = detectSentiment(currentResponseText);
          if (midSentiment) emit("voice:sentiment", { emotion: midSentiment, midResponse: true });
        }
        break;

      case "response.done": {
        const textSnapshot = currentResponseText;
        if (textSnapshot) {
          const sentiment = detectSentiment(textSnapshot);
          if (sentiment) emit("voice:sentiment", { emotion: sentiment });
          handleYukiTranscript(textSnapshot);
          currentResponseText = "";
        }
        if (transport === "webrtc") {
          agentSpeaking = false;
          if (webrtcAgentTalking || webrtcLevelWatcher) {
            scheduleSpeakingStop(textSnapshot);
          } else {
            emitSpeakingStop();
          }
        } else {
          agentSpeaking = false;
          deferSpeakingStopWS();
        }
        break;
      }

      // User speech transcript from Inworld — used for intent detection (betting, etc.)
      case "conversation.item.input_audio_transcription.completed":
        if (msg.transcript) {
          emit("voice:transcript", { text: msg.transcript, role: "user" });
          handleUserTranscript(msg.transcript);
        }
        break;

      // Also handle partial user transcript if Inworld sends it
      case "input_audio_buffer.speech_transcription.delta":
        if (msg.delta) {
          emit("voice:transcript", { text: msg.delta, role: "user", partial: true });
        }
        break;

      default:
        break;
    }
  }

  function maybeStartConversation() {
    if (!sessionReady || greetingSent) return;
    const autoCasino = cfg.MODE !== "companion" && cfg.AUTO_VOICE !== false;
    if (cfg.MODE === "companion") {
      if (!micStream || !audioUnlocked) return;
    } else if (autoCasino) {
      if (!micStream && !audioUnlocked) return;
    } else {
      return;
    }
    greetingSent = true;
    promptGreeting();
  }

  function promptGreeting() {
    if (!isTransportOpen()) return;
    const text =
      "Hey Yuki! I'm on the tennis betting screen — say a bright cheerful hello, hype girl energy, and mention you can help me pick a player!";
    sendJson({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text }],
      },
    });
    sendJson({ type: "response.create" });
  }

  function buildDefaultSessionUpdate() {
    // Fallback if sessionConfig wasn't loaded — minimal config.
    return {
      type: "session.update",
      session: {
        type: "realtime",
        model: (window.YUKI_CONFIG?.ROUTER?.model) || "inworld/yuki-for-betting",
        instructions: "You are Yuki on a voice call for tennis betting. Bright, uplifting, short replies. Help with picks and bet slips when asked.",
        output_modalities: ["audio"],
        audio: {
          input: {
            transcription: { model: "assemblyai/u3-rt-pro" },
            turn_detection: {
              type: "semantic_vad",
              eagerness: "low",
              create_response: true,
              interrupt_response: true,
            },
          },
          output: { model: "inworld-tts-2", voice: "Abby" },
        },
      },
    };
  }

  function disconnect() {
    stopMicCapture();
    interruptPlayback();
    cleanupTransport();
    cleanupSession(true);
  }

  function cleanupTransport() {
    if (ws) {
      try { ws.close(); } catch (_) {}
    }
    ws = null;
    if (pc) {
      try { pc.close(); } catch (_) {}
    }
    pc = null;
    dc = null;
    if (remoteAudioEl) {
      try { remoteAudioEl.remove(); } catch (_) {}
      remoteAudioEl = null;
    }
    if (speakingStopTimer) {
      clearTimeout(speakingStopTimer);
      speakingStopTimer = null;
    }
    stopWebRTCLevelWatcher();
    webrtcAgentTalking = false;
    try { remoteAnalyserSrc?.disconnect(); } catch (_) {}
    remoteAnalyserSrc = null;
    remoteAnalyser = null;
    currentResponseText = "";
    connected = false;
    sessionReady = false;
    transport = "ws";
  }

  function cleanupWs() {
    cleanupTransport();
  }

  function cleanupSession(emitClosed) {
    stopLevelLoop();
    stopSilenceWatcher();
    agentSpeaking = false;
    userSpeaking = false;
    greetingSent = false;
    lastUserSpeechAt = 0;
    lastAgentSpeechEndAt = 0;
    lastSilencePromptAt = 0;
    lastOutcomeVoiceAt = 0;
    if (emitClosed) emit("voice:closed");
  }

  /** Must run inside a user gesture (tap/click) to unlock browser audio + mic. */
  async function unlockAudio() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;

    captureCtx = captureCtx || new Ctx({ latencyHint: "interactive" });
    // Separate playback context — Arc/Chromium forks can suspend shared contexts
    playbackCtx = playbackCtx || new Ctx({ latencyHint: "playback" });

    try {
      if (captureCtx.state === "suspended") await captureCtx.resume();
      if (playbackCtx.state === "suspended") await playbackCtx.resume();
      audioUnlocked = captureCtx.state === "running" || playbackCtx.state === "running";
      maybeStartConversation();
      return audioUnlocked;
    } catch (err) {
      console.warn("[Voice] unlockAudio failed:", err);
      return false;
    }
  }

  async function ensureSession() {
    if (connected && sessionReady) return;
    await connect();
    emit("voice:session:live");
  }

  /** Pre-connect voice on page load (no mic until user taps). */
  async function warmSession() {
    if (!isVoiceConfigured()) return;
    await ensureRuntimeConfig();
    if (useWebRTC()) {
      try {
        await fetchWebRTCConfig();
      } catch (err) {
        console.warn("[Voice] config prefetch failed:", err.message);
      }
    }
    if (connected && sessionReady) return;
    try {
      await connect();
    } catch (err) {
      console.warn("[Voice] warmSession failed:", err.message);
    }
  }

  async function enableMicCapture() {
    if (processor && micStream) return true;

    emit("voice:mic:requesting");
    const micOk = await requestMic();
    if (!micOk) return false;

    return attachMicCapture();
  }

  /** Wire mic stream to WebSocket — call after requestMic() when stream already exists. */
  async function attachMicCapture() {
    if (!micStream) return false;
    if (transport === "webrtc") {
      await attachWebRTCMic();
      return true;
    }
    await unlockAudio();
    await resumeMicPipeline();

    if (!processor) await startMicCapture();
    maybeStartConversation();
    return true;
  }

  /** Keep AudioContext + mic tracks alive (required on mobile Chrome/Safari). */
  async function resumeMicPipeline() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    captureCtx = captureCtx || new Ctx({ latencyHint: "interactive" });
    playbackCtx = playbackCtx || new Ctx({ latencyHint: "playback" });

    if (captureCtx.state === "suspended") {
      try { await captureCtx.resume(); } catch (err) {
        console.warn("[Voice] captureCtx resume failed:", err);
      }
    }
    if (playbackCtx.state === "suspended") {
      try { await playbackCtx.resume(); } catch (_) {}
    }
    audioUnlocked = captureCtx.state === "running";

    if (micStream) {
      micStream.getAudioTracks().forEach((track) => {
        if (!track.enabled) track.enabled = true;
      });
    }
    return audioUnlocked;
  }

  /** Connect + mic on load; falls back to voice-only until the user taps. */
  async function tryAutoStart() {
    if (!isVoiceConfigured()) {
      return { connected: false, mic: false, reason: "not-configured" };
    }
    await ensureRuntimeConfig();
    try {
      await unlockAudio();
    } catch (_) {}

    try {
      await startSession();
      maybeStartConversation();
      return { connected: true, mic: !!micStream };
    } catch (err) {
      console.warn("[Voice] auto-start mic failed:", err.message || err);
      try {
        await warmSession();
        try {
          await unlockAudio();
        } catch (_) {}
        maybeStartConversation();
        return {
          connected: connected && sessionReady,
          mic: false,
          needsGesture: true,
          error: err.message || String(err),
        };
      } catch (fallbackErr) {
        throw fallbackErr;
      }
    }
  }

  async function startSession() {
    await unlockAudio();
    const micOk = await requestMic();
    if (!micOk) throw new Error("microphone-unavailable");

    if (connectPromise) await connectPromise;

    if (sessionReady && transport === "webrtc") {
      await attachWebRTCMic();
    } else if (sessionReady && transport === "ws") {
      await attachMicCapture();
    } else if (useWebRTC()) {
      await connectWebRTC({ withMic: true });
    } else {
      await ensureSession();
      await attachMicCapture();
    }
    return true;
  }

  async function toggleSession() {
    if (connected && sessionReady) {
      disconnect();
      return false;
    }
    return startSession();
  }

  // ---------------------------------------------------------------------------
  // Microphone capture → PCM16 24kHz → input_audio_buffer.append
  // ---------------------------------------------------------------------------
  async function requestMic() {
    if (micStream) return true;
    if (!navigator.mediaDevices?.getUserMedia) {
      emit("voice:mic:denied", { error: "getUserMedia unavailable", code: "unsupported" });
      return false;
    }
    const local = window.YUKI_isLocalHost?.() ?? (location.hostname === "localhost" || location.hostname === "127.0.0.1");
    if (!window.isSecureContext && !local) {
      emit("voice:mic:denied", {
        error: "Microphone requires HTTPS when not on localhost.",
        code: "insecure",
      });
      return false;
    }

    const attempts = [
      {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      },
      { audio: true },
    ];

    for (const constraints of attempts) {
      try {
        micStream = await navigator.mediaDevices.getUserMedia(constraints);
        emit("voice:mic:granted");
        return true;
      } catch (err) {
        console.warn("[Voice] getUserMedia failed:", constraints, err?.name, err?.message);
        if (constraints.audio === true) {
          emit("voice:mic:denied", {
            error: err?.message || String(err),
            name: err?.name || "Error",
            code: err?.name === "NotAllowedError" ? "denied" : "failed",
          });
        }
      }
    }
    return false;
  }

  async function startMicCapture() {
    if (!micStream || !ws) return;
    await resumeMicPipeline();

    const source = captureCtx.createMediaStreamSource(micStream);
    analyser = captureCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const bufferSize = 4096;
    processor = captureCtx.createScriptProcessor(bufferSize, 1, 1);
    let pending = new Float32Array(0);
    const samplesPerChunk = Math.floor((SAMPLE_RATE * CHUNK_MS) / 1000);

    let chunksSent = 0;
    processor.onaudioprocess = (e) => {
      if (transport === "webrtc") return;
      if (!sessionReady || !isTransportOpen()) return;
      if (captureCtx?.state === "suspended") {
        captureCtx.resume().catch(() => {});
        return;
      }
      const input = e.inputBuffer.getChannelData(0);
      const resampled = resample(input, captureCtx.sampleRate, SAMPLE_RATE);
      const merged = mergeFloat32(pending, resampled);
      pending = merged;
      while (pending.length >= samplesPerChunk) {
        const chunk = pending.slice(0, samplesPerChunk);
        pending = pending.slice(samplesPerChunk);
        const pcm = floatTo16BitPCM(chunk);
        sendJson({
          type: "input_audio_buffer.append",
          audio: arrayBufferToBase64(pcm),
        });
        chunksSent += 1;
        if (chunksSent === 1) emit("voice:mic:streaming");
      }
    };

    source.connect(processor);
    const silent = captureCtx.createGain();
    silent.gain.value = 0;
    processor.connect(silent);
    silent.connect(captureCtx.destination);
    startLevelLoop();
  }

  function stopMicCapture() {
    if (processor) {
      try { processor.disconnect(); } catch (_) {}
      processor = null;
    }
    if (micStream) {
      micStream.getTracks().forEach((t) => t.stop());
      micStream = null;
    }
    stopLevelLoop();
  }

  function startLevelLoop() {
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      if (!analyser) return;
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      emit("voice:level", { level: Math.min(1, Math.sqrt(sum / data.length) * 3.2) });
      levelRAF = requestAnimationFrame(tick);
    };
    tick();
  }

  function stopLevelLoop() {
    if (levelRAF) cancelAnimationFrame(levelRAF);
    levelRAF = null;
    emit("voice:level", { level: 0 });
  }

  // ---------------------------------------------------------------------------
  // Agent audio playback (PCM16 24kHz mono)
  // ---------------------------------------------------------------------------
  function getVoiceVolume() {
    return Math.max(0, Math.min(1.2, voiceOutputVolume));
  }

  function applyVoiceVolume() {
    const v = getVoiceVolume();
    if (voiceGainNode) voiceGainNode.gain.value = v;
    if (remoteAudioEl) remoteAudioEl.volume = v;
  }

  function setVoiceVolume(value) {
    voiceOutputVolume = Math.max(0, Math.min(1.2, Number(value) || 0));
    applyVoiceVolume();
    return voiceOutputVolume;
  }

  function ensureVoiceOutput(ctx) {
    if (!ctx) return null;
    if (!voiceGainNode) {
      voiceGainNode = ctx.createGain();
      voiceGainNode.connect(ctx.destination);
      applyVoiceVolume();
    }
    return voiceGainNode;
  }

  function playAudioDelta(base64) {
    if (!audioUnlocked) return;
    if (!playbackCtx) playbackCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (playbackCtx.state === "suspended") {
      playbackCtx.resume().catch(() => {});
      return;
    }

    const pcm = base64ToArrayBuffer(base64);
    const samples = pcm16ToFloat32(pcm);
    applyEdgeFade(samples, 48);

    const buffer = playbackCtx.createBuffer(1, samples.length, SAMPLE_RATE);
    buffer.copyToChannel(samples, 0);

    const src = playbackCtx.createBufferSource();
    src.buffer = buffer;
    const out = ensureVoiceOutput(playbackCtx) || playbackCtx.destination;
    src.connect(out);

    const now = playbackCtx.currentTime;
    if (nextPlayTime < now) nextPlayTime = now + 0.02;
    src.start(nextPlayTime);
    nextPlayTime += buffer.duration;
    scheduledSources.push(src);
    src.onended = () => {
      scheduledSources = scheduledSources.filter((s) => s !== src);
    };
  }

  function interruptPlayback() {
    scheduledSources.forEach((s) => {
      try { s.stop(); } catch (_) {}
    });
    scheduledSources = [];
    nextPlayTime = 0;
    if (speakingStopTimer) {
      clearTimeout(speakingStopTimer);
      speakingStopTimer = null;
    }
    stopWebRTCLevelWatcher();
    webrtcAgentTalking = false;
    currentResponseText = "";
    if (agentSpeaking) {
      agentSpeaking = false;
      emitSpeakingStop();
    }
  }

  // ---------------------------------------------------------------------------
  // Generic context injection — any system text → Yuki's context window
  // ---------------------------------------------------------------------------
  function sendContextSilent(text) {
    if (!isTransportOpen() || !sessionReady) return;
    sendJson({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "system",
        content: [{ type: "input_text", text }],
      },
    });
  }

  function sendContext(text) {
    if (!isTransportOpen() || !sessionReady) return;
    sendJson({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "system",
        content: [{ type: "input_text", text }],
      },
    });
    // Prompt a response so Yuki speaks
    sendJson({ type: "response.create" });
  }

  // ---------------------------------------------------------------------------
  // Roulette integration — context + spoken reactions when voice is live
  // ---------------------------------------------------------------------------
  function notifyGameEvent(type, payload = {}, opts = {}) {
    if (!isTransportOpen() || !sessionReady) return;
    const inConvo = opts.inConversation ?? isInConversation();
    const huge = opts.huge ?? isHugeEvent(type);
    const lines = {
      WIN:  `System: Tennis bet — player won +${payload.amount || payload.net || "?"} credits on ${payload.player || "their pick"}.`,
      LOSE: `System: Tennis bet — player lost ${payload.amount || payload.chip || "?"} credits on ${payload.player || "their pick"}.`,
      IDLE: `System: The player is browsing tennis matches.`,
    };
    let text = lines[type] || `System: Betting event ${type}.`;
    if (inConvo && !huge && OUTCOME_EVENTS.has(type)) {
      text = `Background note (DO NOT mention now — keep the current conversation going naturally): ${text}`;
    } else if (inConvo && AMBIENT_EVENTS.has(type)) {
      text = `Background note (ignore for now unless it fits the chat): ${text}`;
    }
    sendJson({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "system",
        content: [{ type: "input_text", text }],
      },
    });
  }

  /** When voice is live, Yuki speaks a brief reaction — respects conversation priority. */
  function reactToGameEvent(type, payload = {}) {
    if (!isTransportOpen() || !sessionReady) return false;
    if (muted) return false;

    if (type === "IDLE") return promptIdleConversation();

    const inConvo = isInConversation();
    const huge = isHugeEvent(type);
    const isOutcome = OUTCOME_EVENTS.has(type);
    const isAmbient = AMBIENT_EVENTS.has(type);

    notifyGameEvent(type, payload, { inConversation: inConvo, huge });

    if (isAmbient && inConvo) return false;
    if (inConvo && isOutcome && !huge) return false;
    if (isDeepConversation() && inConvo && !huge) return false;

    const now = Date.now();
    if (isOutcome && !huge && now - lastOutcomeVoiceAt < outcomeVoiceCooldownMs()) return false;
    if ((agentSpeaking || userSpeaking) && !huge) return false;

    if (agentSpeaking && huge) {
      interruptPlayback();
      if (isTransportOpen()) sendJson({ type: "response.cancel" });
    }
    userSpeaking = false;

    const upbeat = " Stay bright and encouraging — no pity, no somber tone.";

    const prompts = {
      WIN:  `[Tennis bet win! +${payload.amount || payload.net} on ${payload.player || "their pick"}. Brief happy hype — one short line!]${upbeat}`,
      LOSE: `[Tennis bet loss — lost ${payload.amount || payload.chip}. Quick upbeat encouragement — "next one!" energy, no pity. One line.]${upbeat}`,
    };
    const text = prompts[type];
    if (!text) return false;

    lastOutcomeVoiceAt = now;
    return injectUserPrompt(text);
  }

  function setMuted(value) {
    muted = !!value;
    if (muted) interruptPlayback();
    emit("voice:muted", { muted });
    return muted;
  }

  // ---------------------------------------------------------------------------
  // Audio helpers
  // ---------------------------------------------------------------------------
  function resample(input, fromRate, toRate) {
    if (fromRate === toRate) return input.slice();
    const ratio = fromRate / toRate;
    const outLen = Math.floor(input.length / ratio);
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const pos = i * ratio;
      const idx = Math.floor(pos);
      const frac = pos - idx;
      const a = input[idx] ?? 0;
      const b = input[idx + 1] ?? a;
      out[i] = a + (b - a) * frac;
    }
    return out;
  }

  function mergeFloat32(a, b) {
    const out = new Float32Array(a.length + b.length);
    out.set(a, 0);
    out.set(b, a.length);
    return out;
  }

  function floatTo16BitPCM(float32) {
    const buf = new ArrayBuffer(float32.length * 2);
    const view = new DataView(buf);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buf;
  }

  function pcm16ToFloat32(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    const out = new Float32Array(arrayBuffer.byteLength / 2);
    for (let i = 0; i < out.length; i++) {
      out[i] = view.getInt16(i * 2, true) / 0x8000;
    }
    return out;
  }

  function applyEdgeFade(samples, fadeLen) {
    const n = Math.min(fadeLen, Math.floor(samples.length / 2));
    for (let i = 0; i < n; i++) {
      const g = i / n;
      samples[i] *= g;
      samples[samples.length - 1 - i] *= g;
    }
  }

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function base64ToArrayBuffer(base64) {
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }

  async function checkVoiceServer() {
    await ensureRuntimeConfig();
    try {
      const res = await fetch(voiceServerHealthUrl(), { cache: "no-store" });
      if (!res.ok) return { reachable: false, hasBackend: false, configured: isVoiceConfigured() };
      const data = await res.json();
      const configured = isVoiceConfigured();
      const hasBackend = !!(data?.inworld || data?.voiceProxy || configured);
      return { reachable: true, hasBackend, configured, ...data };
    } catch (_) {
      return { reachable: false, hasBackend: false, configured: isVoiceConfigured() };
    }
  }

  window.Voice = {
    connect,
    disconnect,
    ensureSession,
    warmSession,
    tryAutoStart,
    ensureRuntimeConfig,
    unlockAudio,
    enableMicCapture,
    attachMicCapture,
    startSession,
    toggleSession,
    isConnected: () => connected && sessionReady,
    hasMic: () => !!micStream,
    isVoiceConfigured,
    checkVoiceServer,
    voiceServerHealthUrl,
    wsUrl,
    setMuted,
    isMuted: () => muted,
    notifyGameEvent,
    reactToGameEvent,
    sendContext,
    sendContextSilent,
    isInConversation,
    getConversationVibe,
    requestMic,
    setVoiceVolume,
    getVoiceVolume,
  };
})();
