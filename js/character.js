/**
 * character.js — Yuki reactions for World Cup betting
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
    WIN:     ["Nice pick!", "Winner~ ⚽", "Let's go!", "You got it!"],
    LOSE:    ["Tough break — want another side?", "That one didn't land. Try another team?", "Respectfully noted — next match?", "Close one. Another stake or team?"],
    IDLE:    ["Hey~!", "What's up?", "Talk to me~", "Pick a team~", "Let's go~"],
  };

  function reactToOutcome(type) {
    switch (type) {
      case "WIN":  return { emotion: EMOTION.EXCITED, line: pick(LINES.WIN) };
      case "LOSE": return { emotion: EMOTION.WORRIED, line: pick(LINES.LOSE) };
      case "IDLE": return { emotion: EMOTION.HAPPY,   line: pick(LINES.IDLE) };
      default:     return { emotion: EMOTION.HAPPY,   line: pick(LINES.IDLE) };
    }
  }

  window.Character = { EMOTION, name: "Yuki", reactToOutcome };
})();
