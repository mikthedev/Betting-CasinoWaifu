/**
 * yukiIntro.js — Three-act first conversation for World Cup betting.
 * Adapted from CasinoWaifu intro acts — bet-focused only (no chat-agent path).
 */
(function () {
  const ACT1_NAME = [
    "Hey! What's your name?",
    "Hi there — what's your name?",
    "Hey, good to see you. What's your name?",
  ];

  const ACT2_IDENTITY = [
    "I'm Yuki — I help you pick World Cup bets and fill the slip.",
    "I'm Yuki. I'm here to help you lock in a World Cup pick.",
    "Name's Yuki. I help with picks, stakes, and the bet slip.",
    "I'm Yuki — your World Cup 2026 betting buddy on this screen.",
  ];

  const ACT2_QUESTION = [
    "Want a Round of 16 pick, or got a team in mind?",
    "Fancy a favorite, or chasing an underdog?",
    "Which side of the bracket are you eyeing?",
    "Ready to pick a match, or want my best tip?",
  ];

  const ACT3_REFLECT = {
    tired: [
      "Long day — we'll keep this quick.",
      "Got it. Short picks only then.",
      "Fair. Let's make one clean bet.",
    ],
    good: [
      "Nice energy — let's use it.",
      "Love that. Let's find a sharp pick.",
      "Good vibes. Time to lock something in.",
    ],
    curt: [
      "Got it.",
      "Sure.",
      "Alright.",
    ],
    neutral: [
      "Cool.",
      "Okay.",
      "Sounds good.",
    ],
  };

  const ACT3_INVITE = [
    "Tap a Round of 16 match, or ask me for a pick.",
    "Say a team — like Argentina or France — and I'll set it up.",
    "Want my best pick on the board right now?",
    "Name a stake — 10, 25, 50, or 100 — once you've got a side.",
  ];

  const ACT3_STEP_BACK = [
    "All yours — I'll jump in when you want a pick.",
    "Go browse the bracket. Tap me when you're ready.",
    "Sure. I'm here when you want help placing a bet.",
  ];

  const RETURN_WELCOME = [
    "{name}! Ready for another World Cup bet?",
    "Hey {name} — welcome back to the bracket.",
    "{name}! Want a Round of 16 pick?",
  ];

  const recentPicks = {
    act1: [],
    identity: [],
    question: [],
    invite: [],
    reflect: [],
    stepBack: [],
    welcome: [],
  };

  let phase = "idle"; // idle | act1 | awaiting_name | awaiting_day | awaiting_return | complete
  let act3Offered = false;
  let lastAct3Mood = null;

  function pick(list, bagKey) {
    if (!list?.length) return "";
    const recent = recentPicks[bagKey] || [];
    const fresh = list.filter((item) => !recent.includes(item));
    const choices = fresh.length ? fresh : list;
    const chosen = choices[Math.floor(Math.random() * choices.length)];
    if (bagKey) {
      recent.push(chosen);
      if (recent.length > 3) recent.shift();
      recentPicks[bagKey] = recent;
    }
    return chosen;
  }

  function fill(template, name) {
    return template.replace(/\{name\}/g, name || "there");
  }

  function pacingExtras(extras) {
    return (
      (extras || "Do not add extra explanations or feature talk.") +
      " Speak at a natural conversational pace — don't rush."
    );
  }

  function strictLineHint(line, extras) {
    return (
      `Say this line closely — same words and meaning, natural spoken delivery (contractions OK): "${line}" ` +
      pacingExtras(extras)
    );
  }

  function classifyDayMood(text) {
    const t = (text || "").trim().toLowerCase();
    const words = t.split(/\s+/).filter(Boolean);
    if (words.length <= 4 && !/\?/.test(t)) return "curt";
    if (/\b(tired|exhausted|long day|wiped|drained|rough|stress|stressed|hard day|busy day|burnt out|burned out)\b/.test(t)) {
      return "tired";
    }
    if (/\b(great|good|fine|awesome|pretty good|not bad|alright|okay|decent|excited|ready)\b/.test(t)) {
      return "good";
    }
    return "neutral";
  }

  function wantsToBetFirst(text) {
    return /\b(let me (?:bet|browse|pick)|just (?:bet|browse|wanna bet)|hold on|not now|later|i'll (?:pick|bet)|bracket|match)\b/i.test(
      text || "",
    );
  }

  function isReturningPlayer() {
    return (
      !!window.CharacterMemory?.getUserName?.() ||
      !!window.CharacterMemory?.isReturnVisitor?.()
    );
  }

  function reset() {
    phase = "idle";
    act3Offered = false;
    lastAct3Mood = null;
  }

  function startNew() {
    phase = "act1";
    act3Offered = false;
    lastAct3Mood = null;
  }

  function startReturning() {
    phase = "return_welcome";
    act3Offered = false;
    lastAct3Mood = null;
  }

  function onOpeningDelivered() {
    if (phase === "act1") phase = "awaiting_name";
    if (phase === "return_welcome") phase = "awaiting_return";
  }

  function onNameCaptured() {
    if (phase === "awaiting_name" || phase === "act1") phase = "awaiting_day";
  }

  function onAct3Delivered() {
    act3Offered = true;
    phase = "complete";
  }

  function onStepBackDelivered() {
    phase = "complete";
  }

  function isActive() {
    return phase !== "idle" && phase !== "complete";
  }

  function shouldUseScript() {
    return phase !== "idle" && phase !== "complete";
  }

  function buildAct1Hint() {
    return strictLineHint(
      pick(ACT1_NAME, "act1"),
      "ONE warm short line only — friendly hello + name ask. Do NOT say you're Yuki yet. Do NOT explain features. Wait until they fully finish saying their name.",
    );
  }

  function buildAct2Hint(name) {
    const identity = pick(ACT2_IDENTITY, "identity");
    const question = pick(ACT2_QUESTION, "question");
    const line = `${name} — nice to meet you. ${identity} ${question}`;
    return strictLineHint(
      line,
      "Deliver as 2–3 short spoken sentences in ONE turn. You help with World Cup bets only — not general chat. Do not invite off-topic conversation. Do not say you're an AI.",
    );
  }

  function buildAct3Hint(userText) {
    const mood = classifyDayMood(userText);
    lastAct3Mood = mood;
    const mirror = pick(ACT3_REFLECT[mood] || ACT3_REFLECT.neutral, "reflect");
    if (mood === "curt") {
      return strictLineHint(mirror, "ONE brief line only. Steer toward a bet or wait for them to pick a team. Do NOT invite casual chat.");
    }
    const invite = pick(ACT3_INVITE, "invite");
    return strictLineHint(
      `${mirror} ${invite}`,
      "Stay on betting. Invite a pick, team, or stake — never off-topic chat. No feature dump.",
    );
  }

  function buildStepBackHint() {
    return strictLineHint(pick(ACT3_STEP_BACK, "stepBack"), "ONE short line. Warm, no pressure. Stay bet-focused.");
  }

  function buildReturnOpeningHint(name) {
    return strictLineHint(
      fill(pick(RETURN_WELCOME, "welcome"), name),
      "ONE warm line about World Cup betting. Do NOT ask their name. Do NOT invite casual conversation.",
    );
  }

  function shouldStepBack(userText) {
    return act3Offered && wantsToBetFirst(userText);
  }

  window.YukiIntro = {
    reset,
    startNew,
    startReturning,
    onOpeningDelivered,
    onNameCaptured,
    onAct3Delivered,
    onStepBackDelivered,
    isActive,
    shouldUseScript,
    getPhase: () => phase,
    getLastAct3Mood: () => lastAct3Mood,
    classifyDayMood,
    wantsToBetFirst,
    isReturningPlayer,
    buildAct1Hint,
    buildAct2Hint,
    buildAct3Hint,
    buildStepBackHint,
    buildReturnOpeningHint,
    shouldStepBack,
  };
})();
