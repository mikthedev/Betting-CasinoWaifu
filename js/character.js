/**
 * character.js — Yuki reactions for tennis betting outcomes
 */
(function () {
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  const EMOTION = Object.freeze({
    IDLE:      "idle",
    HAPPY:     "happy",
    EXCITED:   "excited",
    SAD:       "sad",
    THINKING:  "thinking",
    TALKING:   "talking",
    LISTENING: "listening",
    WORRIED:   "worried",
  });

  const LINES = {
    WIN:     ["Nice pick!", "They won~", "Winner! 🎾", "Let's go!"],
    LOSE:    ["Next match!", "Unlucky~", "I'm here!", "Close one!"],
    IDLE:    ["Hey~", "Ready to bet?", "Pick a player~", "Hi hi~"],
  };

  function reactToOutcome(type) {
    switch (type) {
      case "WIN":  return { emotion: EMOTION.HAPPY,   line: pick(LINES.WIN) };
      case "LOSE": return { emotion: EMOTION.SAD,     line: pick(LINES.LOSE) };
      case "IDLE": return { emotion: EMOTION.IDLE,    line: pick(LINES.IDLE) };
      default:     return { emotion: EMOTION.IDLE,    line: pick(LINES.IDLE) };
    }
  }

  window.Character = { EMOTION, name: "Yuki", reactToOutcome };
})();
