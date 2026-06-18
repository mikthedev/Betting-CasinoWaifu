# Local session cost recorder (dev only)

The token usage recorder lives in `local-testing/` and is **gitignored** — it is never pushed to [Betting-CasinoWaifu](https://github.com/mikthedev/Betting-CasinoWaifu).

## Setup

`npm start` runs `scripts/ensure-recorder.mjs` first. It copies recorder files from a sibling **Interactive CasinoWaifu** checkout when `local-testing/` is missing.

Manual copy if needed:

```bash
mkdir -p local-testing/records
cp "../Interactive CasinoWaifu/local-testing/sessionRecorder.js" local-testing/
cp "../Interactive CasinoWaifu/local-testing/sessionRecorder.css" local-testing/
cp "../Interactive CasinoWaifu/local-testing/costRates.js" local-testing/
```

## Usage

```bash
npm start
# Open http://localhost:8787 — Session Recorder widget bottom-left (localhost / LAN dev only)
```

Start recording before talking to Yuki. Stop & Save writes `local-testing/records/<session-id>.json`.

## Verify

```bash
curl http://localhost:8787/health
# devRecorder: true when recorder files exist
curl -s http://localhost:8787/ | grep sessionRecorder
```
