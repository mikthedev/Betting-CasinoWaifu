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
  let lastSyncedUserName = null;
  let startupGraceUntil = 0;
  let connectPromise = null;
  let webrtcCfg = null;

  // Scheduled playback nodes for interrupt support
  let scheduledSources = [];
  let nextPlayTime = 0;

  // Lip-sync (Inworld TTS phoneme timestamps → 3D visemes) — ported from Interactive CasinoWaifu
  const avatar3dEnabled = !!cfg.AVATAR_3D;
  let lipSyncPhones = [];
  let utterancePlaybackAnchor = 0;
  let utterancePlaybackEnd = 0;
  let utteranceClockActive = false;
  let lipSyncPhoneOffset = 0;
  let lipSyncLastPhoneEnd = 0;
  let webrtcLipSyncAnchor = null;
  let lastMouthViseme = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
  let playbackAnalyser = null;
  const LIPSYNC_LEAD_SEC = 0.058;
  const MOUTH_CAPS = { aa: 1.0, ee: 0.72, ih: 0.68, oh: 0.78, ou: 0.62 };

  function visemeToMouthBlend(viseme, strength) {
    const v = (viseme || "").toLowerCase();
    const s = Math.max(0, Math.min(1, strength));
    const w = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
    if (v === "a") w.aa = s * 1.22;
    else if (v === "e" || v === "aei") { w.ee = s * 0.72; w.ih = s * 0.08; }
    else if (v === "ee") w.ee = s * 0.76;
    else if (v === "i") w.ih = s * 0.74;
    else if (v === "o") w.oh = s * 0.74;
    else if (v === "u") w.ou = s * 0.62;
    else if (v === "w" || v === "qw") w.ou = s * 0.44;
    else if (v === "r") { w.oh = s * 0.28; w.ou = s * 0.12; }
    else if (v === "bmp") w.ih = s * 0.11;
    else if (v === "fv") w.ee = s * 0.16;
    else if (v === "l" || v === "th" || v === "y") w.ih = s * 0.26;
    else w.ih = s * 0.2;
    return w;
  }

  function smoothstepViseme(t) {
    const x = Math.max(0, Math.min(1, t));
    return x * x * (3 - 2 * x);
  }

  function mergeMouthBlend(a, b, t) {
    const out = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
    const u = smoothstepViseme(t);
    for (const k of Object.keys(out)) out[k] = (a[k] || 0) * (1 - u) + (b[k] || 0) * u;
    return out;
  }

  function addMouthBlend(dst, src) {
    for (const k of Object.keys(dst)) dst[k] += src[k] || 0;
  }

  function clampMouthBlend(raw) {
    if (raw.aa > 0.18 && raw.oh > 0.12) {
      const total = raw.aa + raw.oh;
      raw.aa = (raw.aa / total) * Math.min(total, 0.95);
      raw.oh = (raw.oh / total) * Math.min(total, 0.95);
    }
    if (raw.ou > 0.1 && raw.oh > 0.1) raw.oh *= 0.4;
    if (raw.aa > 0.2 && raw.ee > 0.1) raw.ee *= 0.5;
    if (raw.aa > 0.2 && raw.ou > 0.1) raw.ou *= 0.55;
    for (const k of Object.keys(MOUTH_CAPS)) raw[k] = Math.min(raw[k] || 0, MOUTH_CAPS[k]);
    return raw;
  }

  function visemeStrengthScale(viseme) {
    const v = (viseme || "").toLowerCase();
    if (v === "a") return 1.12;
    if (v === "e" || v === "ee" || v === "aei") return 1.0;
    if (v === "i") return 1.02;
    if (v === "o") return 0.98;
    if (v === "u") return 0.92;
    if (v === "bmp" || v === "fv") return 0.45;
    return 0.58;
  }

  function phoneTimingWindow(viseme) {
    const v = (viseme || "").toLowerCase();
    if (v === "a") return { lead: 0.055, trail: 0.08, peak: 1.05 };
    if (v === "e" || v === "ee" || v === "aei") return { lead: 0.05, trail: 0.09, peak: 0.72 };
    if (v === "i") return { lead: 0.045, trail: 0.085, peak: 0.7 };
    if (v === "o") return { lead: 0.05, trail: 0.09, peak: 0.66 };
    if (v === "u") return { lead: 0.045, trail: 0.095, peak: 0.58 };
    if (v === "bmp") return { lead: 0.025, trail: 0.035, peak: 0.4 };
    return { lead: 0.032, trail: 0.05, peak: 0.54 };
  }

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
  let lastAgentAudibleUntil = 0;
  let lastAgentResponseWords = 0;
  let lastSilencePromptAt = 0;
  let lastOutcomeVoiceAt = 0;
  let pendingOutcome = null;
  let pendingOutcomeTimer = null;
  let silenceTimer = null;
  let conversationVibe = "happy";
  let awaitingAgentResponse = false;
  let webrtcAudioEndWatcher = null;
  let lastPartialUserText = "";
  let lastUserTranscript = "";
  let lastUserWasShort = false;
  let lastUserWantsDetail = false;

  const HUGE_EVENTS = new Set([]);
  const OUTCOME_EVENTS = new Set(["WIN", "LOSE"]);
  const PRIORITY_OUTCOME_EVENTS = new Set(["WIN", "LOSE"]);
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
    return cfg.EVENT_SYSTEM?.outcomeVoiceCooldownMs ?? 4000;
  }

  function outcomeVoiceDeferMs() {
    return cfg.EVENT_SYSTEM?.outcomeVoiceDeferMs ?? 1000;
  }

  function outcomeVoicePendingMaxMs() {
    return cfg.EVENT_SYSTEM?.outcomeVoicePendingMaxMs ?? 12000;
  }

  function countWords(text) {
    return (text || "").trim().split(/\s+/).filter(Boolean).length;
  }

  function postSpeechListenMs(wordCount) {
    const base = cfg.EVENT_SYSTEM?.postSpeechListenMs ?? 6500;
    const perWord = cfg.EVENT_SYSTEM?.postSpeechListenMsPerWord ?? 50;
    const cap = cfg.EVENT_SYSTEM?.postSpeechListenMsMax ?? 24000;
    const words = wordCount ?? lastAgentResponseWords ?? 0;
    if (words <= 12) return base;
    return Math.min(base + Math.round(words * perWord), cap);
  }

  function extendListenWindowAfterSpeech(wordCount) {
    lastAgentAudibleUntil = Math.max(
      lastAgentAudibleUntil,
      Date.now() + postSpeechListenMs(wordCount)
    );
  }

  function isWsPlaybackPending() {
    if (scheduledSources.length > 0) return true;
    return !!(playbackCtx && nextPlayTime > playbackCtx.currentTime + 0.08);
  }

  function isAgentAudioPending() {
    if (agentSpeaking) return true;
    if (speakingStopTimer || webrtcAudioEndWatcher) return true;
    if (isWsPlaybackPending()) return true;
    if (Date.now() < lastAgentAudibleUntil) return true;
    return false;
  }

  function isActiveVoiceExchange() {
    if (userSpeaking || isWaitingForAgentReply() || agentSpeaking || isWsPlaybackPending()) {
      return true;
    }
    const now = Date.now();
    const userOverlap = cfg.EVENT_SYSTEM?.outcomeUserSpeechOverlapMs ?? 3500;
    const agentOverlap = cfg.EVENT_SYSTEM?.outcomeAgentSpeechOverlapMs ?? 2500;
    if (lastUserSpeechAt && now - lastUserSpeechAt < userOverlap) return true;
    if (lastAgentSpeechEndAt && now - lastAgentSpeechEndAt < agentOverlap) return true;
    return false;
  }

  function markAwaitingAgentResponse() {
    awaitingAgentResponse = true;
    const waitMs = cfg.EVENT_SYSTEM?.agentResponseWaitMs ?? 50000;
    lastAgentAudibleUntil = Math.max(lastAgentAudibleUntil, Date.now() + waitMs);
  }

  function clearAwaitingAgentResponse() {
    awaitingAgentResponse = false;
  }

  function isWaitingForAgentReply() {
    return awaitingAgentResponse;
  }

  function clearPendingOutcome() {
    pendingOutcome = null;
    if (pendingOutcomeTimer) {
      clearTimeout(pendingOutcomeTimer);
      pendingOutcomeTimer = null;
    }
  }

  function schedulePendingOutcome(type, payload) {
    pendingOutcome = { type, payload, queuedAt: Date.now() };
    armPendingOutcomeFlush();
  }

  function armPendingOutcomeFlush(delayMs) {
    if (!pendingOutcome) return;
    if (pendingOutcomeTimer) clearTimeout(pendingOutcomeTimer);
    pendingOutcomeTimer = setTimeout(flushPendingOutcome, delayMs ?? outcomeVoiceDeferMs());
  }

  function flushPendingOutcome() {
    pendingOutcomeTimer = null;
    if (!pendingOutcome || !sessionReady || muted) return;
    if (Date.now() - pendingOutcome.queuedAt > outcomeVoicePendingMaxMs()) {
      clearPendingOutcome();
      return;
    }
    // Only wait on live mic / live agent audio — not post-speech listen grace.
    if (userSpeaking || agentSpeaking || isWsPlaybackPending() || isWaitingForAgentReply()) {
      armPendingOutcomeFlush(250);
      return;
    }
    const { type, payload } = pendingOutcome;
    pendingOutcome = null;
    deliverOutcomeReaction(type, payload);
  }

  function isDeepConversation() {
    return conversationVibe === "sad" || conversationVibe === "worried";
  }

  function getConversationVibe() {
    return conversationVibe;
  }

  function isInConversation() {
    const now = Date.now();
    if (userSpeaking || isWaitingForAgentReply() || isAgentAudioPending()) return true;
    if (lastUserSpeechAt && now - lastUserSpeechAt < conversationGraceMs()) return true;
    if (lastAgentSpeechEndAt && now - lastAgentSpeechEndAt < agentSpeechGraceMs()) return true;
    return false;
  }

  function isHugeEvent(type) {
    return HUGE_EVENTS.has(type);
  }

  function isStartupGrace() {
    return Date.now() < startupGraceUntil;
  }

  function beginStartupGrace(ms = 60000) {
    startupGraceUntil = Date.now() + ms;
    const now = Date.now();
    lastSilencePromptAt = now;
    lastUserSpeechAt = now;
    lastAgentSpeechEndAt = now;
  }

  function isPriorityOutcome(type) {
    return PRIORITY_OUTCOME_EVENTS.has(type);
  }

  function injectUserPrompt(text, { priority = false } = {}) {
    if (!isTransportOpen() || !sessionReady || muted) return false;
    if (!priority && isStartupGrace()) return false;
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
    markAwaitingAgentResponse();
    return true;
  }

  function startSilenceWatcher() {
    stopSilenceWatcher();
    const tickMs = 5000;
    silenceTimer = setInterval(() => {
      if (!sessionReady || muted || userSpeaking || isWaitingForAgentReply() || isAgentAudioPending()) return;
      if (isStartupGrace()) return;
      if (isInConversation()) return;
      const now = Date.now();
      const userSilenceMs = cfg.EVENT_SYSTEM?.userSilenceMs ?? 20000;
      const yukiSilenceMs = 14000;
      const promptCooldownMs = cfg.EVENT_SYSTEM?.silencePromptCooldownMs ?? 55000;
      const userQuiet = lastUserSpeechAt > 0 && now - lastUserSpeechAt >= userSilenceMs;
      const yukiQuiet = lastAgentSpeechEndAt > 0 && now - lastAgentSpeechEndAt >= yukiSilenceMs;
      const promptGap = lastSilencePromptAt > 0 && now - lastSilencePromptAt >= promptCooldownMs;
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
    if (!greetingSent) return false;
    if (!isTransportOpen() || muted || isInConversation() || isStartupGrace()) return false;
    lastSilencePromptAt = Date.now();

    const promptsByVibe = {
      sad: [
        "[Quiet moment. They were down earlier — one warm beat, then something cozy or fun to lift the mood. Upbeat, not somber. Max 12 words.]",
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
    if (!isTransportOpen() || muted || isInConversation() || isStartupGrace()) return false;
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
    stopWebRTCAudioEndWatcher();
    if (speakingStopTimer) {
      clearTimeout(speakingStopTimer);
      speakingStopTimer = null;
    }
    emit("voice:speaking:stop");
    emit("voice:thinking:stop");
    if (!userSpeaking) emit("voice:listening:stop");
    agentSpeaking = false;
    lastAgentSpeechEndAt = Date.now();
    extendListenWindowAfterSpeech(lastAgentResponseWords);
    clearAwaitingAgentResponse();
    armPendingOutcomeFlush(900);
  }

  function deferSpeakingStopWS() {
    if (!isWsPlaybackPending()) {
      emitSpeakingStop();
      return;
    }
    const delayMs = playbackCtx
      ? Math.ceil((nextPlayTime - playbackCtx.currentTime) * 1000) + 350
      : 500;
    lastAgentAudibleUntil = Math.max(lastAgentAudibleUntil, Date.now() + delayMs);
    if (speakingStopTimer) {
      clearTimeout(speakingStopTimer);
      speakingStopTimer = null;
    }
    speakingStopTimer = setTimeout(emitSpeakingStop, delayMs);
  }

  function estimateSpeakDuration(text) {
    const words = countWords(text);
    const WPM = 128;
    const base = words > 0 ? Math.ceil((words / WPM) * 60 * 1000) : 3000;
    const buffer = Math.min(5000, 900 + words * 35);
    return Math.max(base + buffer, 2500);
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
    lastAgentResponseWords = countWords(text);
    waitForWebRTCAudioEnd(delayMs, () => {
      webrtcAgentTalking = false;
      agentSpeaking = false;
      emitSpeakingStop();
    });
  }

  function stopWebRTCAudioEndWatcher() {
    if (webrtcAudioEndWatcher) {
      clearInterval(webrtcAudioEndWatcher);
      webrtcAudioEndWatcher = null;
    }
  }

  function waitForWebRTCAudioEnd(fallbackMs, onDone) {
    stopWebRTCAudioEndWatcher();
    if (speakingStopTimer) {
      clearTimeout(speakingStopTimer);
      speakingStopTimer = null;
    }

    const finish = () => {
      stopWebRTCAudioEndWatcher();
      if (speakingStopTimer) {
        clearTimeout(speakingStopTimer);
        speakingStopTimer = null;
      }
      onDone();
    };

    lastAgentAudibleUntil = Math.max(lastAgentAudibleUntil, Date.now() + fallbackMs);

    if (!remoteAnalyser) {
      speakingStopTimer = setTimeout(finish, fallbackMs);
      return;
    }

    const data = new Uint8Array(remoteAnalyser.frequencyBinCount);
    const FALL_RMS = 2.5;
    const SILENCE_HOLD_MS = 1400;
    const startedAt = Date.now();
    const maxMs = fallbackMs + 4000;
    let silentSince = 0;
    let heardSpeech = webrtcAgentTalking;

    webrtcAudioEndWatcher = setInterval(() => {
      if (Date.now() - startedAt >= maxMs) {
        finish();
        return;
      }

      remoteAnalyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const d = data[i] - 128;
        sum += d * d;
      }
      const rms = Math.sqrt(sum / data.length);

      if (rms > FALL_RMS) {
        heardSpeech = true;
        silentSince = 0;
        return;
      }

      if (!heardSpeech) return;

      if (!silentSince) silentSince = Date.now();
      if (Date.now() - silentSince >= SILENCE_HOLD_MS) finish();
    }, 50);
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

  function detectShortUtterance(text) {
    return countWords(text) <= 10;
  }

  function detectUserNeedsExplanation(text) {
    const t = (text || "").toLowerCase();
    return (
      /\b(explain|tell me more|walk me through|help me understand|i don't understand|never played|first time|new to)\b/.test(t) ||
      /\b(how does|how do i|how to|what is|what are)\b[\s\S]{0,50}\b(bet|betting|work|works|slip|odds|stake|tennis)\b/.test(t)
    );
  }

  const BRIEF_MATCH_HINT =
    "Player spoke briefly. MATCH their length — under 12 words total. Answer first. No filler, no extra questions, no repeating odds.";

  const EXPLAIN_HINT =
    "Player wants to understand — explain like a friend. Simple casual words, 2–4 short sentences. Do NOT mention voice-delegated betting or consent unless they asked you to place bets for them.";

  function notifyBriefReplyMode() {
    sendContextSilent(BRIEF_MATCH_HINT);
  }

  function notifyExplainMode() {
    sendContextSilent(EXPLAIN_HINT);
  }

  function handleUserTranscript(text) {
    if (!text) return;
    if (window.Sports?.isVoicePickRequest?.(text) && !window.Sports?.hasUserPlayerLock?.()) {
      window.Sports.preparePickSuggestion?.(text);
    }
    lastUserTranscript = text;
    lastUserWantsDetail = detectUserNeedsExplanation(text);
    lastUserWasShort = detectShortUtterance(text);
    lastUserSpeechAt = Date.now();
    const prevVibe = conversationVibe;
    const vibe = updateConversationVibe(text);
    if (vibe !== prevVibe) {
      notifyVibeShift(vibe);
      emit("voice:vibe", { vibe, previous: prevVibe });
      if (window.CharacterMemory) window.CharacterMemory.setUserVibe(vibe);
    }
    if (window.CharacterMemory) {
      const prevName = window.CharacterMemory.getUserName?.();
      window.CharacterMemory.addTurn("user", text);
      const newName = window.CharacterMemory.getUserName?.();
      if (newName && newName !== prevName) syncUserNameToVoice();

      const Intro = window.YukiIntro;
      if (Intro?.shouldUseScript?.()) {
        const phase = Intro.getPhase?.();
        if ((phase === "awaiting_name" || phase === "act1") && newName) {
          Intro.onNameCaptured?.();
          sendContextSilent(`System hint: ${Intro.buildAct2Hint(newName)}`);
        } else if (phase === "awaiting_day") {
          if (Intro.shouldStepBack?.(text)) {
            sendContextSilent(`System hint: ${Intro.buildStepBackHint()}`);
            Intro.onStepBackDelivered?.();
          } else {
            sendContextSilent(`System hint: ${Intro.buildAct3Hint(text)}`);
            Intro.onAct3Delivered?.();
          }
        } else if (phase === "awaiting_return") {
          Intro.onAct3Delivered?.();
        }
      }
    }

    if (lastUserWantsDetail) {
      notifyExplainMode();
    } else if (lastUserWasShort) {
      notifyBriefReplyMode();
    }

    if (window.VoiceBetting?.handleUserSpeech) {
      const handled = window.VoiceBetting.handleUserSpeech(text);
      if (handled.needsConsent) {
        sendContextSilent(`System: ${handled.hint}`);
        window.VoiceBetting.requestDelegateConsent().then((granted) => {
          if (!granted) return;
          const retry = window.VoiceBetting.handleUserSpeech(text);
          if (retry.hint) sendContextSilent(`System: ${retry.hint}`);
          if (retry.executed) window.Sports?.syncBoardToVoice?.();
        });
      } else {
        if (handled.hint) sendContextSilent(`System: ${handled.hint}`);
        if (handled.executed) window.Sports?.syncBoardToVoice?.();
      }
    }
  }

  function notifyDelegateConsent(granted) {
    if (!isTransportOpen() || !sessionReady) return;
    if (granted) {
      sendContextSilent(`System: ${window.VoiceBetting?.DELEGATE_CONSENT_HINT || "Player consented to voice-delegated bet placement."}`);
    } else {
      sendContextSilent(
        "System: Player declined voice-delegated bet placement. Do not submit bets for them — they can still fill the slip by voice and tap PLACE BET manually."
      );
    }
  }

  function handleYukiTranscript(text) {
    if (!text) return;
    const clean = window.Sports?.normalizeYukiSpeechText?.(text) || text;
    if (window.CharacterMemory) window.CharacterMemory.addTurn("yuki", clean);
    window.Sports?.absorbYukiSpeechSuggestion?.(clean);
    if (window.Sports?.shouldRepromptPickSpeech?.(clean)) {
      sendContextSilent(
        "System: You spoke internal reasoning aloud (thought/thinking). NEVER say thought, thinking, or narrate reasoning. " +
        "Name ONE roster TEAM immediately — e.g. \"How about Argentina\" — under 15 words."
      );
      sendJson({ type: "response.create" });
      markAwaitingAgentResponse();
    }
    if (window.VoiceBetting?.handleYukiSpeech) {
      const handled = window.VoiceBetting.handleYukiSpeech(clean);
      if (handled.hint) sendContextSilent(`System: ${handled.hint}`);
      if (handled.executed) window.Sports?.syncBoardToVoice?.();
    }
    emit("voice:transcript", { text: clean, role: "yuki" });
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

    // Static-only preview servers — voice proxy stays on REALTIME.port (npm start).
    // Any other local port (incl. alternate PORT=) is same-origin static+WS.
    const local =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "[::1]" ||
      /^192\.168\./.test(host) ||
      /^10\./.test(host);
    const previewPorts = new Set([5500, 5501, 8123, 5173, 4173, 3000, 3001, 8080, 8081]);
    const onPreviewPort = !!(pagePort && previewPorts.has(pagePort));

    if (local && onPreviewPort) {
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
    const previewPorts = new Set([5500, 5501, 8123, 5173, 4173, 3000, 3001, 8080, 8081]);
    const onPreviewPort = !!(pagePort && previewPorts.has(pagePort));
    const base = onPreviewPort
      ? `${window.location.protocol}//${host}:${voicePort}`
      : `${window.location.protocol}//${window.location.host}`;
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
        sendJson(buildSessionUpdatePayload());
        break;

      case "session.updated":
        sessionReady = true;
        beginStartupGrace(90000);
        emit("voice:ready");
        resumeMicPipeline();
        maybeStartConversation();
        startSilenceWatcher();
        onReady();
        break;

      case "input_audio_buffer.speech_started":
        userSpeaking = true;
        lastPartialUserText = "";
        lastUserSpeechAt = Date.now();
        clearAwaitingAgentResponse();
        interruptPlayback();
        if (isTransportOpen()) {
          sendJson({ type: "response.cancel" });
        }
        emit("voice:listening:start");
        emit("voice:thinking:stop");
        break;

      case "input_audio_buffer.committed":
        userSpeaking = false;
        if (window.Sports?.isVoicePickRequest?.(lastPartialUserText)) {
          cancelPendingResponse();
        }
        emit("voice:listening:stop");
        emit("voice:thinking:start");
        break;

      case "response.created":
        currentResponseText = "";
        resetUtteranceLipSync();
        if (transport === "webrtc") {
          emit("voice:thinking:start");
          startWebRTCLevelWatcher();
        }
        break;

      case "response.output_audio.delta":
        if (transport === "webrtc") {
          if (msg.timestamp_info) ingestTimestampInfo(msg.timestamp_info);
          if (lipSyncPhones.length) {
            ensureWebRTCLipSyncClock(false);
            if (!agentSpeaking) {
              agentSpeaking = true;
              webrtcAgentTalking = true;
              emit("voice:thinking:stop");
              emit("voice:speaking:start");
            }
          }
          break;
        }
        ingestTimestampInfo(msg.timestamp_info);
        if (!agentSpeaking) {
          agentSpeaking = true;
          currentResponseText = "";
          emit("voice:thinking:stop");
          emit("voice:transcript:reset");
          emit("voice:speaking:start");
        }
        const audioB64 = msg.delta || msg.audio;
        if (!muted && audioB64) playAudioDelta(audioB64);
        else if (!audioB64 && msg.timestamp_info) ingestTimestampInfo(msg.timestamp_info);
        break;

      case "response.output_audio_transcript.delta":
      case "response.output_text.delta":
        if (msg.delta) {
          currentResponseText += msg.delta;
          emit("voice:transcript", { text: msg.delta, role: "yuki", partial: true });
          if (window.Sports?.isAwaitingYukiPickSpeech?.()) {
            window.Sports.absorbYukiSpeechSuggestion?.(currentResponseText);
          }
          const midSentiment = detectSentiment(currentResponseText);
          if (midSentiment) emit("voice:sentiment", { emotion: midSentiment, midResponse: true });
          if (transport === "webrtc" && msg.timestamp_info) {
            ingestTimestampInfo(msg.timestamp_info);
            if (!agentSpeaking && lipSyncPhones.length) {
              agentSpeaking = true;
              webrtcAgentTalking = true;
              ensureWebRTCLipSyncClock(false);
              emit("voice:thinking:stop");
              emit("voice:speaking:start");
            }
          }
        }
        break;

      case "response.output_audio_transcript.done":
      case "response.output_audio.done":
        if (msg.timestamp_info) ingestTimestampInfo(msg.timestamp_info);
        break;

      case "response.done": {
        const textSnapshot = currentResponseText;
        if (textSnapshot) {
          lastAgentResponseWords = countWords(textSnapshot);
          const sentiment = detectSentiment(textSnapshot);
          if (sentiment) emit("voice:sentiment", { emotion: sentiment });
          handleYukiTranscript(textSnapshot);
          currentResponseText = "";
          if (greetingSent && isStartupGrace()) {
            lastAgentSpeechEndAt = Date.now();
          }
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
          lastPartialUserText += msg.delta;
          emit("voice:transcript", { text: msg.delta, role: "user", partial: true });
          if (window.Sports?.prepareEarlyPickRequest?.(lastPartialUserText)) {
            cancelPendingResponse();
          }
        }
        break;

      default:
        break;
    }
  }

  function maybeStartConversation() {
    if (!sessionReady || greetingSent) return;
    // Companion + tap-to-start overlay both need mic unlocked after a user gesture.
    if (!micStream || !audioUnlocked) return;
    greetingSent = true;
    promptGreeting();
  }

  function syncUserNameToVoice() {
    const name = window.CharacterMemory?.getUserName?.();
    if (!name || name === lastSyncedUserName) return;
    lastSyncedUserName = name;
    sendContextSilent(
      `USER_NAME: ${name}. The user's name is ${name} — remember it for this session. Use it occasionally in friendly replies (not every line).`
    );
  }

  function promptGreeting() {
    if (!isTransportOpen()) return;
    const name = window.CharacterMemory?.getUserName?.();
    syncUserNameToVoice();
    beginStartupGrace(90000);

    const Intro = window.YukiIntro;
    let text;
    if (Intro) {
      if (name || Intro.isReturningPlayer?.()) {
        Intro.startReturning();
        text = `System hint for opening: ${Intro.buildReturnOpeningHint(name || "friend")}`;
      } else {
        Intro.startNew();
        text = `System hint for opening: ${Intro.buildAct1Hint()}`;
      }
      Intro.onOpeningDelivered?.();
    } else {
      text = name
        ? `Hey Yuki! Voice connected on the World Cup 2026 betting screen. Welcome ${name} back — you're Yuki, their betting helper. In 2 short sentences: say hi to ${name}, say you're here to help with Round of 16 bets, ask what they'd like to bet on. No feature lists. No casual-chat invite.`
        : "Hey Yuki! Voice connected on the World Cup 2026 Round of 16 screen. ONE short line only: ask their name warmly. Do NOT introduce yourself as Yuki yet. Do NOT list features.";
    }

    sendJson({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text }],
      },
    });
    sendJson({ type: "response.create" });
    markAwaitingAgentResponse();
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
    stopWebRTCAudioEndWatcher();
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
    clearPendingOutcome();
    agentSpeaking = false;
    userSpeaking = false;
    greetingSent = false;
    startupGraceUntil = 0;
    awaitingAgentResponse = false;
    lastAgentAudibleUntil = 0;
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
      const resumes = [];
      if (captureCtx.state === "suspended") resumes.push(captureCtx.resume());
      if (playbackCtx.state === "suspended") resumes.push(playbackCtx.resume());
      // Without a user gesture, resume() can hang forever — don't block voice boot.
      if (resumes.length) {
        await Promise.race([
          Promise.all(resumes),
          new Promise((resolve) => setTimeout(resolve, 120)),
        ]);
      }
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

  function buildSessionUpdatePayload() {
    const base = window.YUKI_SESSION_UPDATE || buildDefaultSessionUpdate();
    const update = JSON.parse(JSON.stringify(base));
    if (avatar3dEnabled) {
      update.session.providerData = update.session.providerData || {};
      update.session.providerData.tts = {
        timestamp_type: "WORD",
        timestamp_transport_strategy: "SYNC",
      };
    }
    return update;
  }

  function resetUtteranceLipSync() {
    lipSyncPhones = [];
    utteranceClockActive = false;
    utterancePlaybackAnchor = 0;
    utterancePlaybackEnd = 0;
    lipSyncPhoneOffset = 0;
    lipSyncLastPhoneEnd = 0;
    webrtcLipSyncAnchor = null;
    lastMouthViseme = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
  }

  function ensureWebRTCLipSyncClock(forceNewAnchor = false) {
    if (transport !== "webrtc" || !avatar3dEnabled) return;
    if (!playbackCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) playbackCtx = new Ctx({ latencyHint: "playback" });
    }
    if (!playbackCtx) return;
    if (playbackCtx.state === "suspended") playbackCtx.resume().catch(() => {});
    if (forceNewAnchor || !utteranceClockActive) {
      utterancePlaybackAnchor = playbackCtx.currentTime;
      utteranceClockActive = true;
      webrtcLipSyncAnchor = utterancePlaybackAnchor;
    }
    webrtcAgentTalking = true;
  }

  function getLipSyncTime() {
    if (utteranceClockActive && playbackCtx) {
      return Math.max(0, playbackCtx.currentTime - utterancePlaybackAnchor + LIPSYNC_LEAD_SEC);
    }
    return 0;
  }

  function lipSyncTailSeconds() {
    return lipSyncLastPhoneEnd + 0.28;
  }

  function isWithinLipSyncTail() {
    return lipSyncPhones.length > 0 && getLipSyncTime() <= lipSyncTailSeconds();
  }

  function ensurePlaybackAnalyser(ctx) {
    if (!ctx || playbackAnalyser) return;
    const out = ensureVoiceOutput(ctx);
    if (!out) return;
    playbackAnalyser = ctx.createAnalyser();
    playbackAnalyser.fftSize = 256;
    out.connect(playbackAnalyser);
  }

  function isAgentAudioPlaying() {
    if (transport === "webrtc" && webrtcAgentTalking && remoteAudioEl && !remoteAudioEl.paused) {
      return true;
    }
    if (!playbackCtx) return false;
    if (scheduledSources.length > 0) return true;
    if (!utteranceClockActive) return false;
    return playbackCtx.currentTime < utterancePlaybackEnd + 0.08;
  }

  function ingestTimestampInfo(timestampInfo) {
    if (!avatar3dEnabled || !timestampInfo) return;
    const align = timestampInfo.word_alignment || timestampInfo.wordAlignment;
    if (!align) return;
    const details = align.phonetic_details || align.phoneticDetails || [];
    const batch = [];
    for (const detail of details) {
      for (const phone of detail.phones || []) {
        const viseme = String(phone.viseme_symbol || phone.visemeSymbol || "").toLowerCase();
        const start = phone.start_time_seconds ?? phone.startTimeSeconds ?? 0;
        const dur = phone.duration_seconds ?? phone.durationSeconds ?? 0;
        if (!viseme || viseme === "[silence]") continue;
        batch.push({ viseme, start, end: start + dur });
      }
    }
    if (!batch.length) return;

    batch.sort((a, b) => a.start - b.start);
    const firstBatch = !lipSyncPhones.length;
    if (lipSyncPhones.length && batch[0].start < 0.12) {
      lipSyncPhoneOffset = lipSyncLastPhoneEnd;
    } else if (firstBatch) {
      lipSyncPhoneOffset = 0;
    }
    for (const p of batch) {
      const start = p.start + lipSyncPhoneOffset;
      const end = p.end + lipSyncPhoneOffset;
      lipSyncPhones.push({ viseme: p.viseme, start, end });
      lipSyncLastPhoneEnd = Math.max(lipSyncLastPhoneEnd, end);
    }
    lipSyncPhones.sort((a, b) => a.start - b.start);
    if (transport === "webrtc") {
      ensureWebRTCLipSyncClock(firstBatch);
      if (!agentSpeaking) {
        agentSpeaking = true;
        webrtcAgentTalking = true;
        emit("voice:thinking:stop");
        emit("voice:speaking:start");
      }
    }
  }

  function lipSyncClockReady() {
    if (!avatar3dEnabled) return false;
    if (playbackCtx) return true;
    return transport === "webrtc" && !!remoteAudioEl;
  }

  function getVisemeWeights() {
    if (!lipSyncClockReady()) return null;
    if (transport === "webrtc" && lipSyncPhones.length && !utteranceClockActive) {
      ensureWebRTCLipSyncClock(true);
    }
    const lipSyncLive =
      utteranceClockActive ||
      isAgentAudioPlaying() ||
      isWithinLipSyncTail() ||
      (lipSyncPhones.length > 0 && (agentSpeaking || webrtcAgentTalking));
    if (!lipSyncLive) {
      for (const k of Object.keys(lastMouthViseme)) lastMouthViseme[k] *= 0.78;
      const tail = mouthOpenAmount(lastMouthViseme);
      return tail > 0.008 ? { ...lastMouthViseme } : null;
    }

    const t = getLipSyncTime();
    const raw = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
    let bilabialClosure = 0;

    for (let i = 0; i < lipSyncPhones.length; i++) {
      const phone = lipSyncPhones[i];
      const viseme = phone.viseme;
      const win = phoneTimingWindow(viseme);
      const dur = Math.max(0.028, phone.end - phone.start);
      const mid = (phone.start + phone.end) * 0.5;
      const scale = visemeStrengthScale(viseme);

      if (t >= phone.start - win.lead && t <= phone.end + win.trail) {
        const edgeIn = smoothstepViseme((t - (phone.start - win.lead)) / Math.max(0.04, win.lead));
        const edgeOut = smoothstepViseme(((phone.end + win.trail) - t) / Math.max(0.045, win.trail));
        const env = edgeIn * edgeOut;
        const center = 1 - Math.min(1, Math.abs(t - mid) / (dur * 0.62));
        const strength = (0.2 + center * win.peak) * env * scale;
        addMouthBlend(raw, visemeToMouthBlend(viseme, strength));
        if (viseme === "bmp") {
          bilabialClosure = Math.max(bilabialClosure, env * Math.max(0, center));
        }
      }

      const next = lipSyncPhones[i + 1];
      if (next && t >= phone.end - 0.06 && t <= next.start + 0.06) {
        const gap = Math.max(0.04, (next.start + 0.06) - (phone.end - 0.06));
        const blendT = (t - (phone.end - 0.06)) / gap;
        const s1 = visemeStrengthScale(viseme) * 0.42;
        const s2 = visemeStrengthScale(next.viseme) * 0.42;
        addMouthBlend(
          raw,
          mergeMouthBlend(
            visemeToMouthBlend(viseme, s1),
            visemeToMouthBlend(next.viseme, s2),
            blendT,
          ),
        );
      }
    }

    clampMouthBlend(raw);
    if (bilabialClosure > 0) {
      const shut = 1 - 0.75 * Math.min(1, bilabialClosure);
      for (const k of Object.keys(raw)) raw[k] *= shut;
    }

    const attack = 0.58;
    const release = 0.30;
    let total = 0;
    for (const k of Object.keys(raw)) {
      const tgt = raw[k];
      const cur = lastMouthViseme[k];
      const smooth = tgt > cur ? attack : release;
      lastMouthViseme[k] = cur * (1 - smooth) + tgt * smooth;
      total += lastMouthViseme[k];
    }

    if (total < 0.008) return null;
    return { ...lastMouthViseme };
  }

  function mouthOpenAmount(weights) {
    return (weights.aa || 0) + (weights.ih || 0) + (weights.ou || 0) + (weights.ee || 0) + (weights.oh || 0);
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
    if (!utteranceClockActive) {
      utterancePlaybackAnchor = nextPlayTime;
      utteranceClockActive = true;
    }
    src.start(nextPlayTime);
    nextPlayTime += buffer.duration;
    utterancePlaybackEnd = nextPlayTime;
    ensurePlaybackAnalyser(playbackCtx);
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
    resetUtteranceLipSync();
    if (speakingStopTimer) {
      clearTimeout(speakingStopTimer);
      speakingStopTimer = null;
    }
    stopWebRTCLevelWatcher();
    stopWebRTCAudioEndWatcher();
    webrtcAgentTalking = false;
    lastAgentAudibleUntil = 0;
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
    // Do not stack a spoken response on top of the opening greeting
    if (isStartupGrace()) return;
    sendJson({ type: "response.create" });
    markAwaitingAgentResponse();
  }

  /** Inject context then speak — cancels any in-flight VAD reply so context lands first. */
  function sendContextAndRespond(text, { bypassGrace = false } = {}) {
    if (!isTransportOpen() || !sessionReady) return;
    sendContextSilent(text);
    if (!bypassGrace && isStartupGrace()) return;
    sendJson({ type: "response.cancel" });
    sendJson({ type: "response.create" });
    markAwaitingAgentResponse();
  }

  function cancelPendingResponse() {
    if (!isTransportOpen()) return;
    sendJson({ type: "response.cancel" });
    clearAwaitingAgentResponse();
  }

  // ---------------------------------------------------------------------------
  // Roulette integration — context + spoken reactions when voice is live
  // ---------------------------------------------------------------------------
  function notifyGameEvent(type, payload = {}, opts = {}) {
    if (!isTransportOpen() || !sessionReady) return;
    const priorityOutcome = isPriorityOutcome(type);
    const inConvo = opts.inConversation ?? isInConversation();
    const huge = opts.huge ?? isHugeEvent(type);
    const lines = {
      WIN:  `System: World Cup bet WON — +${payload.amount || payload.net || "?"} on ${payload.player || "their pick"} (${payload.tournament || "World Cup"} @ ${payload.odds ?? "?"}).`,
      LOSE: `System: World Cup bet LOST — −${payload.amount || payload.chip || "?"} on ${payload.player || "their pick"} (${payload.tournament || "World Cup"} @ ${payload.odds ?? "?"}). The user's pick was ${payload.player || "unknown"} — use this exact name. Respond empathetically; never laugh, mock, or use sarcasm.`,
      IDLE: `System: The player is browsing World Cup matches.`,
    };
    let text = lines[type] || `System: Betting event ${type}.`;
    if (priorityOutcome) {
      text += " React NOW with one short spoken line — the user just saw the bet result.";
    } else if (inConvo && !huge && OUTCOME_EVENTS.has(type)) {
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

  /** When voice is live, Yuki speaks a brief bet outcome reaction. */
  function deliverOutcomeReaction(type, payload = {}) {
    if (!isTransportOpen() || !sessionReady || muted) return false;

    const priorityOutcome = isPriorityOutcome(type);
    const team = payload.player || "their pick";
    const winTone = " Stay bright and encouraging — one short line.";
    const lossTone = " Be empathetic and respectful — acknowledge the loss briefly, no laughing, no mockery, no sarcasm. Offer a next step (another pick, stake, or bracket side). One short line.";

    const prompts = {
      WIN:
        `[World Cup bet WON! +${payload.amount || payload.net || "?"} on ${team}. ` +
        `Say something like: "Congratulations on your bet — want to keep supporting the teams?" ` +
        `One short happy line, then invite another pick.]${winTone}`,
      LOSE:
        `[World Cup bet loss — ${team} lost, −${payload.amount || payload.chip || "?"}. ` +
        `Use the exact team name ${team}. Brief empathy + offer another pick.]${lossTone}`,
    };
    const text = prompts[type];
    if (!text) return false;

    lastOutcomeVoiceAt = Date.now();
    // Clear listen locks so the next turn isn't blocked by the previous line.
    lastAgentAudibleUntil = 0;
    return injectUserPrompt(text, { priority: priorityOutcome });
  }

  /** When voice is live, Yuki speaks a brief reaction — queues win/loss only if mic is busy. */
  function reactToGameEvent(type, payload = {}) {
    if (!isTransportOpen() || !sessionReady) return false;
    if (muted) return false;
    if (type === "IDLE" && isStartupGrace()) return false;

    if (type === "IDLE") return promptIdleConversation();

    const inConvo = isInConversation();
    const activeExchange = isActiveVoiceExchange();
    const huge = isHugeEvent(type);
    const isOutcome = OUTCOME_EVENTS.has(type);
    const priorityOutcome = isPriorityOutcome(type);
    const isAmbient = AMBIENT_EVENTS.has(type);

    notifyGameEvent(type, payload, {
      inConversation: inConvo && !priorityOutcome,
      huge: huge || priorityOutcome,
    });

    if (isAmbient && activeExchange) return false;
    if (isAmbient && inConvo) return false;
    if (inConvo && isOutcome && !huge && !priorityOutcome) return false;
    if (isDeepConversation() && inConvo && !huge && !priorityOutcome) return false;

    if (priorityOutcome) {
      // User just placed a bet — congratulate/commiserate immediately.
      clearPendingOutcome();
      if (agentSpeaking || isWaitingForAgentReply() || isWsPlaybackPending()) {
        interruptPlayback();
        cancelPendingResponse();
      }
      lastAgentAudibleUntil = 0;
      lastAgentSpeechEndAt = 0;
      if (userSpeaking) {
        schedulePendingOutcome(type, payload);
        return false;
      }
      return deliverOutcomeReaction(type, payload);
    }

    if (activeExchange && !huge) return false;
    if ((agentSpeaking || userSpeaking) && !huge) return false;

    return deliverOutcomeReaction(type, payload);
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
    notifyDelegateConsent,
    sendContext,
    sendContextSilent,
    sendContextAndRespond,
    cancelPendingResponse,
    syncUserNameToVoice,
    isInConversation,
    isStartupGrace,
    getConversationVibe,
    requestMic,
    setVoiceVolume,
    getVoiceVolume,
    getVisemeWeights,
    isAgentAudioPlaying,
  };
})();
