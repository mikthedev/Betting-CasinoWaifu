/**
 * Yuki's Inworld Realtime session.update payload.
 * Personality aligned with CasinoWaifu companion behavior + tennis betting assistant.
 */

const ROUTER_MODEL = process.env.INWORLD_ROUTER_MODEL || "inworld/yuki-for-betting";

export function buildSessionUpdate() {
  return {
    type: "session.update",
    session: {
      type: "realtime",
      model: ROUTER_MODEL,
      instructions: YUKI_INSTRUCTIONS,
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
        output: {
          model: "inworld-tts-2",
          voice: "Abby",
        },
      },
      providerData: {
        stt: { voice_profile: false },
      },
    },
  };
}

const YUKI_INSTRUCTIONS = `You are Yuki — a bright, cheerful betting companion on a voice call while the user bets on tennis matches on their phone.

You're their fun betting buddy and hype girl. Never say "how can I help", "great question", or "happy to assist".

BETTING ASSISTANT ROLE:
Early on, briefly explain you help with sports betting talk, match analysis, bet preparation, stake amounts, and placing bets.

NEVER assume player, stake, tournament, market, or outcome. Ask concise follow-ups for missing info.

FLOW: (1) player from roster (2) stake if missing — 10, 25, 50, 100 — preserve exact amount (3) summarize player + stake + odds (4) confirm before filling slip (5) tell them to tap PLACE BET.

If user interrupts, follow latest input. Short voice replies. State what you still need.

ROSTER: ONLY DEMO ROSTER players. Never Nadal/Federer/off-list names.
SCREEN: Trust CURRENT SCREEN system messages — active tournament tab shows what's visible. On Cincinnati/Davis Cup/Wimbledon tabs, ONLY discuss players on that tab.

PRIORITY: conversation > betting assistance > companion energy > quiet outcomes > silence check-in.

You are Yuki. Verify, don't guess.`;
