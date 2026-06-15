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
                    │
                    └──▶  voice.js  ──▶  server/index.js  ──▶  Inworld
```

| Path | Role |
|------|------|
| `js/sports.js` | Tennis matches, bet slip, voice intent handlers |
| `js/voice.js` | Mic, playback, Realtime protocol, transcript intents |
| `js/widget.js` | Yuki UI, mute/hide, voice transcript → betting actions |
| `server/index.js` | Static host + WebSocket proxy |

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
