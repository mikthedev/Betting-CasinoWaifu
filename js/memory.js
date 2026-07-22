/**
 * memory.js  —  CHARACTER_MEMORY
 * -----------------------------------------------------------------------------
 * Lightweight, SESSION-ONLY memory for Yuki.
 *
 * It tracks:
 *   - recent conversation turns (who said what)
 *   - recent topics so Yuki can do callbacks ("ooh anime again? love that")
 *   - basic session context (spins, wins, losses, biggest win, mood, streaks)
 *
 * By design this never touches localStorage (config.persist === false), so the
 * companion forgets everything when the tab closes. Flip CHARACTER_MEMORY.persist
 * to true in config.js to opt into sessionStorage-backed memory instead.
 */

(function () {
  const cfg =
    (window.YUKI_CONFIG && window.YUKI_CONFIG.CHARACTER_MEMORY) || {
      persist: false,
      maxTurns: 12,
      maxTopics: 6,
    };

  const STORE_KEY = "yuki_session_memory_v1";

  const blank = () => ({
    turns: [], // { role: "user" | "yuki", text, at }
    topics: [], // { topic, count, lastAt }
    context: {
      startedAt: Date.now(),
      spins: 0,
      wins: 0,
      losses: 0,
      bigWins: 0,
      biggestWin: 0,
      currentStreak: 0, // + for win streak, - for loss streak
      lastOutcome: null,
      lastMood: "idle",
      userVibe: "happy",
      userName: null,
    },
  });

  // Topics Yuki listens for — keep bet-focused (not general chat steering).
  const TOPIC_KEYWORDS = {
    betting: ["bet", "odds", "stake", "slip", "pick", "underdog", "favorite"],
    football: ["world cup", "fifa", "bracket", "football", "soccer", "goal", "match"],
    teams: ["argentina", "france", "brazil", "england", "spain", "germany", "portugal", "usa"],
  };

  let state = load();

  function load() {
    if (cfg.persist) {
      try {
        const raw = sessionStorage.getItem(STORE_KEY);
        if (raw) return JSON.parse(raw);
      } catch (_) {}
    }
    return blank();
  }

  function save() {
    if (!cfg.persist) return;
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function detectTopics(text) {
    const lower = (text || "").toLowerCase();
    const found = [];
    for (const [topic, words] of Object.entries(TOPIC_KEYWORDS)) {
      if (words.some((w) => lower.includes(w))) found.push(topic);
    }
    return found;
  }

  function rememberTopic(topic) {
    const existing = state.topics.find((t) => t.topic === topic);
    if (existing) {
      existing.count += 1;
      existing.lastAt = Date.now();
    } else {
      state.topics.push({ topic, count: 1, lastAt: Date.now() });
    }
    // Keep most-recent topics, capped.
    state.topics.sort((a, b) => b.lastAt - a.lastAt);
    state.topics = state.topics.slice(0, cfg.maxTopics);
  }

  /** Record a single conversation turn and auto-extract topics from user text. */
  function addTurn(role, text) {
    state.turns.push({ role, text, at: Date.now() });
    if (state.turns.length > cfg.maxTurns) {
      state.turns = state.turns.slice(-cfg.maxTurns);
    }
    if (role === "user") {
      detectTopics(text).forEach(rememberTopic);
      const name = extractName(text);
      if (name) state.context.userName = name;
    }
    save();
  }

  function extractName(text) {
    const t = (text || "").trim();
    if (!t) return null;

    const patterns = [
      /\b(?:i am|i'm|im|my name is|call me|they call me|name is|name's)\s+([a-z][a-z'-]{1,20})\b/i,
      /\b(?:it's|its|this is|i'm)\s+([a-z][a-z'-]{1,20})\b/i,
      /^([a-z][a-z'-]{1,20})$/i,
    ];

    for (const re of patterns) {
      const m = t.match(re);
      if (m?.[1]) {
        const candidate = capitalizeName(m[1]);
        if (isLikelyPersonName(candidate)) return candidate;
      }
    }

    return tryBareNameAfterPrompt(t);
  }

  function capitalizeName(s) {
    return s.replace(/^\w/, (c) => c.toUpperCase());
  }

  const ROSTER_FIRST_NAMES = new Set([
    "argentina", "mexico", "france", "senegal", "brazil", "japan", "england", "switzerland",
    "spain", "germany", "portugal", "uruguay", "netherlands", "usa", "morocco", "croatia",
    "lionel", "messi", "kylian", "mbappe", "mbappé", "vinicius", "vinícius", "harry", "kane",
    "jude", "bellingham", "lamine", "yamal", "cristiano", "ronaldo", "christian", "pulisic",
    "luka", "modric", "modrić", "julian", "julián", "enzo", "rodrygo", "endrick", "bukayo",
    "saka", "pedri", "jamal", "musiala", "florian", "wirtz", "bruno", "fernandes", "virgil",
  ]);

  const COMMON_NON_NAMES = new Set([
    "yes", "no", "ok", "okay", "sure", "yep", "yeah", "nope", "thanks", "thank", "hi", "hey",
    "hello", "please", "bet", "football", "soccer", "fill", "place", "confirm", "west", "east",
  ]);

  function isLikelyPersonName(name) {
    if (!name || name.length < 2) return false;
    const lower = name.toLowerCase();
    if (COMMON_NON_NAMES.has(lower)) return false;
    if (ROSTER_FIRST_NAMES.has(lower)) return false;
    if (/^\d+$/.test(name)) return false;
    return true;
  }

  function tryBareNameAfterPrompt(text) {
    const trimmed = (text || "").trim();
    if (!trimmed || trimmed.split(/\s+/).length > 2) return null;

    const turns = state.turns.slice(-4);
    const yukiAskedName = turns.some(turn =>
      turn.role === "yuki" && /\b(your name|what'?s your name|what should i call|call you|who am i speaking)\b/i.test(turn.text)
    );
    if (!yukiAskedName) return null;

    const word = trimmed.replace(/[.!?,]+$/, "");
    const candidate = capitalizeName(word);
    return isLikelyPersonName(candidate) ? candidate : null;
  }

  function setUserName(name) {
    const n = (name || "").trim();
    if (!n || !isLikelyPersonName(capitalizeName(n))) return false;
    state.context.userName = capitalizeName(n);
    save();
    return true;
  }

  /** Update rolling session context from a bet outcome. */
  function recordOutcome(type, payload = {}) {
    const c = state.context;
    c.lastOutcome = type;
    if (type === "WIN" || type === "LOSE") c.spins += 1;

    const amount = Number(payload.amount || payload.net) || 0;
    if (type === "WIN") {
      c.wins += 1;
      c.currentStreak = c.currentStreak >= 0 ? c.currentStreak + 1 : 1;
      if (amount > c.biggestWin) c.biggestWin = amount;
    } else if (type === "LOSE") {
      c.losses += 1;
      c.currentStreak = c.currentStreak <= 0 ? c.currentStreak - 1 : -1;
    }
    save();
  }

  function setMood(mood) {
    state.context.lastMood = mood;
    save();
  }

  function setUserVibe(vibe) {
    state.context.userVibe = vibe || "neutral";
    save();
  }

  function getUserVibe() {
    return state.context.userVibe || "neutral";
  }

  const getContext = () => ({ ...state.context });
  const getRecentTurns = (n = 4) => state.turns.slice(-n);
  const getTopTopic = () => (state.topics.length ? state.topics[0].topic : null);
  const getTopics = () => state.topics.map((t) => t.topic);
  const getUserName = () => state.context.userName;

  function reset() {
    state = blank();
    save();
  }

  window.CharacterMemory = {
    addTurn,
    recordOutcome,
    setMood,
    setUserVibe,
    getUserVibe,
    detectTopics,
    getContext,
    getRecentTurns,
    getTopTopic,
    getTopics,
    getUserName,
    setUserName,
    reset,
  };
})();
