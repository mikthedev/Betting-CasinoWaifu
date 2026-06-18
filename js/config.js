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
    outcomeVoiceCooldownMs: 4000,
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
  // Character sprites — keyed by interaction emotion (matches asset filenames)
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

  // Yuki overlay on the tennis betting screen
  MODE: "overlay",
  AUTO_VOICE: true,
};
