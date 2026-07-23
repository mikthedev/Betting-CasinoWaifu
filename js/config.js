/**
 * config.js — client configuration (no secrets here)
 */

window.YUKI_CONFIG = {
  // ---------------------------------------------------------------------------
  // INWORLD ROUTER — chat completions (server proxy, key never in browser)
  // ---------------------------------------------------------------------------
  ROUTER: {
    model: "inworld/yuki-for-betting",
    chatUrl: null, // null = same-origin /api/chat/completions
  },

  // ---------------------------------------------------------------------------
  // INWORLD REALTIME — WebSocket proxy (API key lives on the server only)
  // ---------------------------------------------------------------------------
  REALTIME: {
    // null = auto-detect from page host + port below
    wsUrl: null,
    port: 8787,
  },

  // ---------------------------------------------------------------------------
  // EVENT_SYSTEM
  // ---------------------------------------------------------------------------
  EVENT_SYSTEM: {
    channel: "betting-casinowaifu",
    debug: true,
    idleTimeoutMs: 22000,
    userSilenceMs: 20000,
    silencePromptCooldownMs: 55000,
    conversationGraceMs: 18000,
    deepConversationGraceMs: 28000,
    agentSpeechGraceMs: 9000,
    postSpeechListenMs: 6500,
    postSpeechListenMsPerWord: 50,
    postSpeechListenMsMax: 24000,
    outcomeVoiceCooldownMs: 1200,
    outcomeVoiceDeferMs: 180,
    outcomeVoicePendingMaxMs: 6000,
    outcomeUserSpeechOverlapMs: 1200,
    outcomeAgentSpeechOverlapMs: 800,
    agentResponseWaitMs: 50000,
  },

  // ---------------------------------------------------------------------------
  // CHARACTER_MEMORY
  // ---------------------------------------------------------------------------
  CHARACTER_MEMORY: {
    persist: false,
    maxTurns: 12,
    maxTopics: 6,
  },

  // ---------------------------------------------------------------------------
  // Character sprites — 2D fallback if WebGL/3D fails
  // ---------------------------------------------------------------------------
  CHARACTER: {
    name: "Yuki",
    sprites: {
      idle: "assets/Yuki_idle.png",
      happy: "assets/Yuki_happy.png",
      excited: "assets/Yuki_excited.png",
      sad: "assets/Yuki_sad.png",
      talking: "assets/Yuki_talking.png",
      thinking: "assets/Yuki_thinking.png",
      listening: "assets/Yuki_listening.png",
      worried: "assets/Yuki_worried.png",
    },
  },

  // 3D VRM avatar (CasinoWaifu street look)
  AVATAR_3D: {
    modelUrl: "assets/vrm/yuki_street.vrm",
    skins: [
      {
        id: "street",
        label: "Yuki",
        url: "assets/vrm/yuki_street.vrm",
      },
    ],
  },

  // Yuki overlay — bet helper only (not a general chat companion)
  MODE: "overlay",
  // false = wait for tap on Yuki before connecting mic / greeting
  AUTO_VOICE: false,
};
