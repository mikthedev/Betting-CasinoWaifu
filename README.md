# Betting CasinoWaifu

Voice-guided **tennis betting** with **Yuki**, an anime AI companion powered by **Inworld Realtime** voice. Plain HTML, CSS, and JavaScript — no React, no build step.

```
npm install
cp .env.example .env   # add INWORLD_API_KEY
npm start              # http://localhost:8787
```

---

## What you get

- Tennis match betting (Wimbledon, Cincinnati, Davis Cup) with live odds drift
- **Voice betting** — ask Yuki for picks, name a player, confirm slips by voice
- Yuki widget with mute/hide controls and emotional reactions to wins and losses
- Inworld Realtime speech-to-speech (no browser TTS)

---

## Quick start

### 1. Install & configure

```bash
npm install
cp .env.example .env
```

Edit `.env`:

```env
INWORLD_API_KEY=your_base64_credential_here
PORT=8787
```

### 2. Run

```bash
npm start
```

Open **http://localhost:8787** (must use the Node server — not `file://`).

### 3. Voice betting

| Say to Yuki | What happens |
|-------------|--------------|
| "I want to bet on tennis" | Yuki guides you through matches |
| "Who's the best pick?" | Yuki recommends a player and offers to fill the slip |
| "Bet on Alcaraz" | Yuki selects that player |
| "Yes, fill it" | Yuki autofills the bet slip — tap **PLACE BET** to confirm |

Tap Yuki to connect voice. Allow microphone when prompted.

```bash
npm run test:greeting   # should print SUCCESS
```

---

## Architecture

```
sports.js  ──▶  EventBus  ──▶  widget.js  ──▶  character.js
     │              │
     │              └──▶  router.js  ──▶  /api/chat/completions  ──▶  Inworld Router
     │                        (inworld/yuki-for-betting)
     └──▶  voice.js  ──▶  server/index.js  ──▶  Inworld Realtime
```

| Path | Role |
|------|------|
| `lib/inworld-router.mjs` | Server-side Router chat completions (Basic auth) |
| `api/chat/completions.js` | Vercel/local proxy — streams SSE to browser |
| `js/router.js` | Client streaming chat + betting metadata |
| `js/sports.js` | Tennis betting + voice/router intent handlers |
| `js/voice.js` | Realtime voice (uses same router model in session) |

### Inworld Router

Yuki's betting personality lives in the Inworld Router (`inworld/yuki-for-betting`). The API key is never sent to the browser.

```bash
# .env
INWORLD_API_KEY=your_base64_key_here
INWORLD_ROUTER_MODEL=inworld/yuki-for-betting
```

Test the router:

```bash
npm run test:router
```

Client usage:

```javascript
await Router.chat(
  [{ role: "user", content: "Who should I bet on?" }],
  {
    metadata: Router.buildBettingMetadata({ intent: "best_pick" }),
    onDelta: ({ content }) => console.log(content),
  }
);
```

Betting intents pass `extra_body.metadata` (balance, flow_state, player, odds, tournament) for conditional routing in your Inworld router config.

---

## Deploy (Vercel)

1. Import the GitHub repo on [vercel.com](https://vercel.com)
2. **Framework Preset:** Other
3. **Root Directory:** `.`
4. Add `INWORLD_API_KEY` in project environment variables
5. Redeploy

Voice on Vercel uses **Inworld WebRTC** — the browser connects directly to Inworld; `/api/webrtc-config` mints a short-lived token.

Locally, voice uses `npm start` (WebSocket proxy on port 8787).

---

*Prototype — no real money involved.*
