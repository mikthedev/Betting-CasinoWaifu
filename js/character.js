/**
 * character.js — Yuki reactions for tennis betting (uplifting casino-buddy energy)
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
    WIN:     ["Nice pick!", "Winner~ 🎾", "Let's go!", "You got it!"],
    LOSE:    ["Next match!", "We bounce back!", "Unlucky — next one's ours!", "Almost~"],
    IDLE:    ["Hey~!", "What's up?", "Talk to me~", "Pick a player~", "Let's go~"],
  };

  function reactToOutcome(type) {
    switch (type) {
      case "WIN":  return { emotion: EMOTION.HAPPY,   line: pick(LINES.WIN) };
      case "LOSE": return { emotion: EMOTION.HAPPY,   line: pick(LINES.LOSE) };
      case "IDLE": return { emotion: EMOTION.HAPPY,   line: pick(LINES.IDLE) };
      default:     return { emotion: EMOTION.HAPPY,   line: pick(LINES.IDLE) };
    }
  }

  window.Character = { EMOTION, name: "Yuki", reactToOutcome };
})();
