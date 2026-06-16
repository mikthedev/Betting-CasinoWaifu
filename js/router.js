/**
 * router.js — Inworld Router chat completions (streaming) via server proxy
 *
 * Public API:
 *   Router.chat(messages, { metadata, onDelta, onDone, onError })
 *   Router.buildBettingMetadata(overrides)
 *   Router.isConfigured()
 */
(function () {
  const cfg = window.YUKI_CONFIG?.ROUTER || {};
  const bus = window.EventBus;

  function chatUrl() {
    if (cfg.chatUrl) return cfg.chatUrl;
    const rt = window.YUKI_RUNTIME || {};
    if (rt.voiceBackendUrl) return `${rt.voiceBackendUrl.replace(/\/$/, "")}/api/chat/completions`;
    return "/api/chat/completions";
  }

  function isConfigured() {
    return window.YUKI_isVoiceConfigured?.() ?? true;
  }

  function buildBettingMetadata(overrides = {}) {
    const best = window.Sports?.getBestPlayer?.();
    const roster = window.Sports?.getRosterMetadata?.() ?? {};
    return {
      app: "betting-casinowaifu",
      balance: window.Betting?.getBalance?.() ?? 0,
      flow_state: window.Sports?.flowState ?? "idle",
      best_player: best?.player?.fullName ?? null,
      best_odds: best?.player?.odds ?? null,
      tournament: window.Sports?.getActiveTournament?.() ?? best?.match?.tournament ?? null,
      available_tournaments: roster.tournaments ?? [],
      available_player_names: roster.player_names ?? [],
      available_matches: roster.matches ?? [],
      roster_rules: "Only suggest or fill bets for players in available_player_names. Never invent players.",
      ...overrides,
    };
  }

  async function chat(messages, opts = {}) {
    const { metadata, onDelta, onDone, onError, stream = true, model } = opts;

    let res;
    try {
      res = await fetch(chatUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, metadata, stream, model }),
      });
    } catch (err) {
      onError?.(err);
      throw err;
    }

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      const err = new Error(errBody || `Router HTTP ${res.status}`);
      onError?.(err);
      throw err;
    }

    if (!stream) {
      const json = await res.json();
      const text = json.choices?.[0]?.message?.content || "";
      onDelta?.({ content: text, done: true });
      onDone?.(text);
      bus?.emit("router:done", { text, metadata });
      return text;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      const err = new Error("Streaming not supported");
      onError?.(err);
      throw err;
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";

    bus?.emit("router:start", { metadata });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;

        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") {
          onDone?.(full);
          bus?.emit("router:done", { text: full, metadata });
          return full;
        }

        try {
          const chunk = JSON.parse(data);
          const delta = chunk.choices?.[0]?.delta;
          if (!delta) continue;

          const content = delta.content || "";
          const reasoning = delta.reasoning_content || "";

          if (content) {
            full += content;
            onDelta?.({ content, reasoning, partial: full });
            bus?.emit("router:delta", { content, reasoning, partial: full });
          } else if (reasoning) {
            onDelta?.({ content: "", reasoning, partial: full });
            bus?.emit("router:reasoning", { reasoning });
          }
        } catch (_) {
          /* ignore malformed SSE lines */
        }
      }
    }

    onDone?.(full);
    bus?.emit("router:done", { text: full, metadata });
    return full;
  }

  window.Router = {
    chat,
    buildBettingMetadata,
    isConfigured,
    chatUrl,
  };
})();
