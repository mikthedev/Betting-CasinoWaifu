# Betting CasinoWaifu

Voice-guided **World Cup 2026** betting with **Yuki**, a 3D anime AI helper powered by **Inworld Realtime** voice. Plain HTML, CSS, and JavaScript — no React, no build step.

Yuki is **only** here to help you place bets — not a general chat companion. No registration.

```
npm install
cp .env.example .env   # add INWORLD_API_KEY
npm start              # http://localhost:8787
```

---

## What you get

- **World Cup 2026 Round of 16** bracket UI (West / East) with big-name teams and star players
- Match Winner, Over/Under 2.5, and BTTS markets
- **Desktop + phone** layouts — phone frame on mobile; three-column desktop with Yuki panel
- **3D Yuki** (VRM) with mute/hide controls styled to match her frame
- **Three-act intro** (name → identity as bet helper → invite a pick) — stays on betting
- Voice betting — ask Yuki for picks, name a team, confirm slips by voice

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
| "Who's the best pick?" | Yuki recommends a team and offers to fill the slip |
| "Bet on Argentina" | Yuki selects that team |
| "Yes, fill it" | Yuki autofills the bet slip — tap **PLACE BET** to confirm |

Tap Yuki to connect voice. Allow microphone when prompted.

```bash
npm run test:greeting   # should print SUCCESS
```

---

## Architecture

```
sports.js  ──▶  EventBus  ──▶  widget.js (+ 3D avatar)  ──▶  character.js
     │              │
     │              └──▶  router.js  ──▶  /api/chat/completions  ──▶  Inworld Router
     │                        (inworld/yuki-for-betting)
     └──▶  voice.js  ──▶  server/index.js  ──▶  Inworld Realtime
```

3D avatar deps are copied to `/vendor` via `scripts/sync-vendor.mjs` (runs on `postinstall` and Vercel build).

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
