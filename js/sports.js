/**
 * sports.js — Multi-tournament Tennis Sports Betting
 *
 * Public API on window.Sports:
 *   Sports.handleBetIntent()
 *   Sports.handleBestPlayerIntent()
 *   Sports.handleNamedPlayerIntent(matchId, playerId)
 *   Sports.handleTournamentIntent(tournamentId)
 *   Sports.findTournamentBySpeech(text)
 */
(function () {
  const bus = window.EventBus;

  // ── Match data ──────────────────────────────────────────────────────────────
  const MATCHES = [
    // ── Wimbledon 2025 ──────────────────────────────────────────────────────
    {
      id: "wim_sf1",
      tournament: "Wimbledon",
      round: "Semi-Final",
      surface: "Grass",
      status: "live",
      time: null,
      score: "2-1 (7-5, 4-6, 3-2)",
      stats: { p1: { aces: 12, firstServe: 71, breakPts: 3 }, p2: { aces: 8, firstServe: 64, breakPts: 1 } },
      players: [
        { id: "alcaraz",  name: "C. Alcaraz",  fullName: "Carlos Alcaraz",    flag: "🇪🇸", rank: 3, form: [1,1,1,1,0], baseOdds: 1.72, odds: 1.72, perf: 78 },
        { id: "djokovic", name: "N. Djokovic", fullName: "Novak Djokovic",    flag: "🇷🇸", rank: 6, form: [1,1,0,1,1], baseOdds: 2.15, odds: 2.15, perf: 68 },
      ],
    },
    {
      id: "wim_sf2",
      tournament: "Wimbledon",
      round: "Semi-Final",
      surface: "Grass",
      status: "live",
      time: null,
      score: "1-1 (6-3, 4-6, 0-0)",
      stats: { p1: { aces: 14, firstServe: 68, breakPts: 2 }, p2: { aces: 5, firstServe: 73, breakPts: 4 } },
      players: [
        { id: "sinner",  name: "J. Sinner",  fullName: "Jannik Sinner",      flag: "🇮🇹", rank: 1, form: [1,1,1,0,1], baseOdds: 1.58, odds: 1.58, perf: 85 },
        { id: "zverev",  name: "A. Zverev",  fullName: "Alexander Zverev",   flag: "🇩🇪", rank: 2, form: [1,0,1,1,1], baseOdds: 2.40, odds: 2.40, perf: 65 },
      ],
    },
    {
      id: "wim_qf1",
      tournament: "Wimbledon",
      round: "Quarter-Final",
      surface: "Grass",
      status: "upcoming",
      time: "Today, 13:00",
      score: null,
      stats: null,
      players: [
        { id: "fritz",    name: "T. Fritz",   fullName: "Taylor Fritz",       flag: "🇺🇸", rank: 4, form: [1,1,0,1,0], baseOdds: 2.80, odds: 2.80, perf: 58 },
        { id: "medvedev", name: "D. Medvedev",fullName: "Daniil Medvedev",    flag: "🇷🇺", rank: 5, form: [0,1,1,0,1], baseOdds: 1.45, odds: 1.45, perf: 72 },
      ],
    },
    {
      id: "wim_qf2",
      tournament: "Wimbledon",
      round: "Quarter-Final",
      surface: "Grass",
      status: "upcoming",
      time: "Today, 15:30",
      score: null,
      stats: null,
      players: [
        { id: "rune",    name: "H. Rune",    fullName: "Holger Rune",         flag: "🇩🇰", rank: 15, form: [1,0,1,1,0], baseOdds: 2.20, odds: 2.20, perf: 55 },
        { id: "shelton", name: "B. Shelton", fullName: "Ben Shelton",          flag: "🇺🇸", rank: 14, form: [0,1,0,1,1], baseOdds: 1.70, odds: 1.70, perf: 60 },
      ],
    },

    // ── ATP 1000 Cincinnati ──────────────────────────────────────────────────
    {
      id: "cin_qf1",
      tournament: "Cincinnati",
      round: "Quarter-Final",
      surface: "Hard",
      status: "live",
      time: null,
      score: "1-0 (6-4, 3-3*)",
      stats: { p1: { aces: 6, firstServe: 62, breakPts: 2 }, p2: { aces: 9, firstServe: 70, breakPts: 1 } },
      players: [
        { id: "tsitsipas",  name: "S. Tsitsipas",  fullName: "Stefanos Tsitsipas", flag: "🇬🇷", rank: 9,  form: [0,1,1,0,1], baseOdds: 2.10, odds: 2.10, perf: 62 },
        { id: "deminaur",   name: "A. de Minaur",  fullName: "Alex de Minaur",    flag: "🇦🇺", rank: 8,  form: [1,1,0,1,1], baseOdds: 1.80, odds: 1.80, perf: 69 },
      ],
    },
    {
      id: "cin_qf2",
      tournament: "Cincinnati",
      round: "Quarter-Final",
      surface: "Hard",
      status: "upcoming",
      time: "Tomorrow, 18:00",
      score: null,
      stats: null,
      players: [
        { id: "rublev", name: "A. Rublev", fullName: "Andrey Rublev",           flag: "🇷🇺", rank: 7,  form: [1,0,1,1,0], baseOdds: 1.90, odds: 1.90, perf: 66 },
        { id: "draper", name: "J. Draper", fullName: "Jack Draper",             flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", rank: 12, form: [1,1,1,0,1], baseOdds: 2.00, odds: 2.00, perf: 71 },
      ],
    },
    {
      id: "cin_qf3",
      tournament: "Cincinnati",
      round: "Quarter-Final",
      surface: "Hard",
      status: "upcoming",
      time: "Tomorrow, 20:30",
      score: null,
      stats: null,
      players: [
        { id: "tiafoe",  name: "F. Tiafoe", fullName: "Frances Tiafoe",        flag: "🇺🇸", rank: 18, form: [0,1,1,0,1], baseOdds: 3.20, odds: 3.20, perf: 48 },
        { id: "musetti", name: "L. Musetti", fullName: "Lorenzo Musetti",      flag: "🇮🇹", rank: 16, form: [1,1,0,0,1], baseOdds: 1.35, odds: 1.35, perf: 74 },
      ],
    },

    // ── Davis Cup ────────────────────────────────────────────────────────────
    {
      id: "dc_r1",
      tournament: "Davis Cup",
      round: "Group Stage",
      surface: "Clay",
      status: "upcoming",
      time: "Fri, 14:00",
      score: null,
      stats: null,
      players: [
        { id: "norrie",   name: "C. Norrie",  fullName: "Cameron Norrie",      flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", rank: 22, form: [1,0,1,0,1], baseOdds: 2.60, odds: 2.60, perf: 50 },
        { id: "hurkacz",  name: "H. Hurkacz", fullName: "Hubert Hurkacz",      flag: "🇵🇱", rank: 10, form: [1,1,0,1,1], baseOdds: 1.52, odds: 1.52, perf: 73 },
      ],
    },
  ];

  // ── State ────────────────────────────────────────────────────────────────────
  let selectedMatchId  = null;
  let selectedPlayerId = null;
  let selectedChip     = 25;
  let activeTournament = "all";
  let activeBetType    = "winner"; // winner | handicap | ou
  let oddsTickInterval = null;

  let yukiFlowState   = "idle";
  let yukiPendingMatch  = null;
  let yukiPendingPlayer = null;
  let lastSuggestedMatchId  = null;
  let lastSuggestedPlayerId = null;
  let suggestedPlayerIds    = [];
  let userChosenMatchId     = null;
  let userChosenPlayerId    = null;
  let lockedFillTarget      = null;
  let fillGeneration        = 0;
  let fillTimers            = [];

  let matchesEl = null;
  let betSlipEl = null;
  let placeBtnEl = null;

  // ── Odds drift ───────────────────────────────────────────────────────────────
  function driftOdds() {
    MATCHES.forEach(m => {
      // Also drift live stats for live matches
      if (m.status === "live" && m.stats) {
        m.stats.p1.aces     = Math.max(0, m.stats.p1.aces + (Math.random() > 0.7 ? 1 : 0));
        m.stats.p1.firstServe = Math.min(85, Math.max(50, m.stats.p1.firstServe + Math.round((Math.random()-0.5)*3)));
        m.stats.p2.aces     = Math.max(0, m.stats.p2.aces + (Math.random() > 0.7 ? 1 : 0));
        m.stats.p2.firstServe = Math.min(85, Math.max(50, m.stats.p2.firstServe + Math.round((Math.random()-0.5)*3)));

        // Update stats row if rendered
        const statsRow = document.querySelector(`#card-${m.id} .match-live-stats`);
        if (statsRow) {
          statsRow.innerHTML = buildStatsRowHTML(m);
        }
      }

      m.players.forEach(p => {
        const drift  = (Math.random() - 0.5) * 0.06;
        const newOdds = Math.max(1.10, Math.min(9.99, p.odds + drift));
        const dir    = newOdds > p.odds ? "up" : newOdds < p.odds ? "down" : "";
        p.odds = Math.round(newOdds * 100) / 100;

        const perfDrift = (Math.random() - 0.5) * 4;
        p.perf = Math.max(20, Math.min(98, p.perf + perfDrift));

        const btnEl = document.querySelector(`[data-match="${m.id}"][data-player="${p.id}"] .player-odds-val`);
        if (btnEl) {
          btnEl.textContent = p.odds.toFixed(2);
          btnEl.classList.remove("odds-up", "odds-down");
          if (dir) {
            btnEl.classList.add(`odds-${dir}`);
            setTimeout(() => btnEl.classList.remove(`odds-${dir}`), 1200);
          }
        }
      });

      if (m.id === selectedMatchId) updateReturns();
    });
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  function render() {
    matchesEl = document.getElementById("sports-matches");
    if (!matchesEl) return;

    renderTournamentTabs();
    renderMatches();
    bindBetSlip();
    updateBetTypeUI();
  }

  function renderTournamentTabs() {
    const tabsEl = document.getElementById("sports-tournament-tabs");
    if (!tabsEl) return;
    const tournaments = ["all", ...new Set(MATCHES.map(m => m.tournament))];
    tabsEl.innerHTML = tournaments.map(t =>
      `<button class="tour-tab${t === activeTournament ? " active" : ""}" data-tour="${t}">
        ${t === "all" ? "All Tournaments" : t}
      </button>`
    ).join("");
    tabsEl.querySelectorAll(".tour-tab").forEach(btn => {
      btn.addEventListener("click", () => selectTournament(btn.dataset.tour));
    });
  }

  function selectTournament(tournamentId, { scroll = true } = {}) {
    activeTournament = tournamentId;
    const tabsEl = document.getElementById("sports-tournament-tabs");
    tabsEl?.querySelectorAll(".tour-tab").forEach(b => {
      b.classList.toggle("active", b.dataset.tour === tournamentId);
    });
    renderMatches();

    if (!scroll) return;

    const tab = tabsEl?.querySelector(`[data-tour="${tournamentId}"]`);
    tab?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    tab?.classList.add("tour-tab-flash");
    setTimeout(() => tab?.classList.remove("tour-tab-flash"), 1400);

    const pool = tournamentId === "all" ? MATCHES : MATCHES.filter(m => m.tournament === tournamentId);
    const target = pool.find(m => m.status === "live") || pool[0];
    if (target) {
      setTimeout(() => {
        document.getElementById(`card-${target.id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 280);
    }
  }

  function summarizeTournament(tournamentId) {
    const pool = tournamentId === "all" ? MATCHES : MATCHES.filter(m => m.tournament === tournamentId);
    if (!pool.length) return "No matches listed right now.";
    return pool.map(m => {
      const [p1, p2] = m.players;
      const status = m.status === "live"
        ? `LIVE now, score ${m.score}`
        : `upcoming ${m.time || "soon"}`;
      return `${m.round}: ${p1.fullName} vs ${p2.fullName} (${status}, odds ${p1.odds.toFixed(2)} / ${p2.odds.toFixed(2)})`;
    }).join(". ");
  }

  function findTournamentBySpeech(text) {
    const t = (text || "").toLowerCase();
    if (/\b(all tournaments|every tournament|all matches)\b/.test(t)) return "all";
    if (/\b(cincinnati|cincy)\b/.test(t)) return "Cincinnati";
    if (/\b(davis cup|davis)\b/.test(t)) return "Davis Cup";
    if (/\bwimbledon\b/.test(t)) return "Wimbledon";
    return null;
  }

  function isTournamentNavIntent(text) {
    const t = (text || "").toLowerCase();
    if (!findTournamentBySpeech(t)) return false;
    if (findPlayerByName(t) && /\b(bet|pick|choose|back)\b/.test(t)) return false;
    if (/\b(best|recommend|top|who should)\b/.test(t) && /\b(bet|pick)\b/.test(t)) return false;
    return /\b(check|check out|checkout|show|switch|go to|take me|see|look|what|tell|happening|going on|anything|matches|there|about|at|open|view|want to)\b/.test(t);
  }

  function handleTournamentIntent(tournamentId) {
    removeSuggestionBanner();
    yukiFlowState = "idle";
    yukiPendingMatch = yukiPendingPlayer = null;

    selectTournament(tournamentId);

    const label = tournamentId === "all" ? "all tournaments" : tournamentId;
    const summary = summarizeTournament(tournamentId);

    window.Voice?.sendContext?.(
      `System: The player switched to ${label}. ${summary}. Tell them what's live and worth watching — keep it brief and enthusiastic.`
    );
    askRouter("tournament_nav", `What's happening at ${label}?`, {
      tournament: tournamentId,
      match_count: (tournamentId === "all" ? MATCHES : MATCHES.filter(m => m.tournament === tournamentId)).length,
    });

    bus?.emit("sports:tournament", { tournament: tournamentId, summary });
  }

  function renderMatches() {
    if (!matchesEl) return;
    const visible = activeTournament === "all"
      ? MATCHES
      : MATCHES.filter(m => m.tournament === activeTournament);
    matchesEl.innerHTML = visible.map(m => renderMatchCard(m)).join("");

    matchesEl.querySelectorAll(".player-odds-btn").forEach(btn => {
      btn.addEventListener("click", () => selectOdds(btn.dataset.match, btn.dataset.player));
    });
    updateBestBadgesVisibility();
  }

  function buildStatsRowHTML(m) {
    const { p1, p2 } = m.stats;
    return `
      <span class="stat-item"><span class="stat-val">${p1.aces}</span><span class="stat-key">ACE</span><span class="stat-val">${p2.aces}</span></span>
      <span class="stat-divider"></span>
      <span class="stat-item"><span class="stat-val">${p1.firstServe}%</span><span class="stat-key">1ST SRV</span><span class="stat-val">${p2.firstServe}%</span></span>
      <span class="stat-divider"></span>
      <span class="stat-item"><span class="stat-val">${p1.breakPts}</span><span class="stat-key">BRK PTS</span><span class="stat-val">${p2.breakPts}</span></span>
    `;
  }

  function renderMatchCard(m) {
    const [p1, p2] = m.players;
    const bestPerfPlayer = p1.perf >= p2.perf ? p1 : p2;
    const matchHasFocus =
      (selectedMatchId === m.id && selectedPlayerId) ||
      (yukiPendingMatch?.id === m.id && yukiPendingPlayer);

    const showBestBadge = (player) =>
      !matchHasFocus && bestPerfPlayer.id === player.id;

    const badge = m.status === "live"
      ? `<span class="live-badge"><span class="live-dot"></span>LIVE</span>`
      : `<span class="upcoming-badge">UPCOMING</span>`;

    const scoreOrTime = m.score
      ? `<span class="match-score">${m.score}</span>`
      : m.time
      ? `<span class="match-time">${m.time}</span>`
      : "";

    const sel1 = selectedMatchId === m.id && selectedPlayerId === p1.id ? " selected" : "";
    const sel2 = selectedMatchId === m.id && selectedPlayerId === p2.id ? " selected" : "";
    const yuki1 = yukiPendingMatch?.id === m.id && yukiPendingPlayer?.id === p1.id ? " yuki-suggested" : "";
    const yuki2 = yukiPendingMatch?.id === m.id && yukiPendingPlayer?.id === p2.id ? " yuki-suggested" : "";

    const formDots = p => p.form.map(w =>
      `<span class="form-dot ${w ? "w" : "l"}"></span>`
    ).join("");

    const perfBar = p => {
      const pct = Math.round(p.perf);
      return `<span class="perf-bar"><span class="perf-fill" style="width:${pct}%"></span></span>`;
    };

    const statsRowHTML = (m.status === "live" && m.stats)
      ? `<div class="match-live-stats">${buildStatsRowHTML(m)}</div>`
      : "";

    // Handicap / O/U odds are derived from base odds
    const p1HandicapOdds = (p1.odds * 0.72).toFixed(2);
    const p2HandicapOdds = (p2.odds * 0.72).toFixed(2);
    const ouOverOdds  = "1.85";
    const ouUnderOdds = "1.95";

    const oddsSection = activeBetType === "winner" ? `
      <button class="player-odds-btn${sel1}${yuki1}" data-match="${m.id}" data-player="${p1.id}">
        ${showBestBadge(p1) ? '<span class="best-pick-badge">⭐ Best</span>' : ""}
        <span class="player-flag">${p1.flag}</span>
        <span class="player-name">${p1.name}</span>
        <span class="player-rank">#${p1.rank}</span>
        <span class="player-odds-val">${p1.odds.toFixed(2)}</span>
        <span class="player-form">${formDots(p1)}</span>
        ${perfBar(p1)}
      </button>
      <div class="match-vs-col"><span class="match-vs">VS</span>${scoreOrTime}</div>
      <button class="player-odds-btn${sel2}${yuki2}" data-match="${m.id}" data-player="${p2.id}">
        ${showBestBadge(p2) ? '<span class="best-pick-badge">⭐ Best</span>' : ""}
        <span class="player-flag">${p2.flag}</span>
        <span class="player-name">${p2.name}</span>
        <span class="player-rank">#${p2.rank}</span>
        <span class="player-odds-val">${p2.odds.toFixed(2)}</span>
        <span class="player-form">${formDots(p2)}</span>
        ${perfBar(p2)}
      </button>
    ` : activeBetType === "handicap" ? `
      <button class="player-odds-btn handicap${sel1}" data-match="${m.id}" data-player="${p1.id}">
        <span class="player-flag">${p1.flag}</span>
        <span class="player-name">${p1.name} +1.5</span>
        <span class="player-odds-val">${p1HandicapOdds}</span>
      </button>
      <div class="match-vs-col"><span class="match-vs">HC</span></div>
      <button class="player-odds-btn handicap${sel2}" data-match="${m.id}" data-player="${p2.id}">
        <span class="player-flag">${p2.flag}</span>
        <span class="player-name">${p2.name} +1.5</span>
        <span class="player-odds-val">${p2HandicapOdds}</span>
      </button>
    ` : `
      <button class="player-odds-btn ou${sel1}" data-match="${m.id}" data-player="${p1.id}">
        <span class="player-name">Over 3.5 Sets</span>
        <span class="player-odds-val">${ouOverOdds}</span>
      </button>
      <div class="match-vs-col"><span class="match-vs">O/U</span></div>
      <button class="player-odds-btn ou${sel2}" data-match="${m.id}" data-player="${p2.id}">
        <span class="player-name">Under 3.5 Sets</span>
        <span class="player-odds-val">${ouUnderOdds}</span>
      </button>
    `;

    return `
<div class="match-card" id="card-${m.id}">
  <div class="match-header">
    <span class="match-tournament">${m.tournament} <span class="match-surface ${m.surface.toLowerCase()}">${m.surface}</span></span>
    <span class="match-round">${m.round}</span>
    ${badge}
  </div>
  <div class="match-players">${oddsSection}</div>
  ${statsRowHTML}
</div>`;
  }

  // ── Bet type tabs ─────────────────────────────────────────────────────────────
  function updateBetTypeUI() {
    const tabsEl = document.getElementById("sports-bet-type-tabs");
    if (!tabsEl) return;
    tabsEl.querySelectorAll(".bet-type-tab").forEach(b => {
      b.classList.toggle("active", b.dataset.betType === activeBetType);
    });
    tabsEl.querySelectorAll(".bet-type-tab").forEach(b => {
      b.addEventListener("click", () => {
        activeBetType = b.dataset.betType;
        updateBetTypeUI();
        renderMatches();
      });
    });
  }

  // ── Selection & bet slip ─────────────────────────────────────────────────────
  function selectOdds(matchId, playerId, { animate = false, fromYuki = false } = {}) {
    selectedMatchId  = matchId;
    selectedPlayerId = playerId;

    if (!fromYuki) {
      removeSuggestionBanner();
      if (yukiPendingPlayer?.id !== playerId || yukiPendingMatch?.id !== matchId) {
        yukiFlowState = "idle";
        yukiPendingMatch = yukiPendingPlayer = null;
      }
    }

    document.querySelectorAll(".player-odds-btn").forEach(btn => {
      const isThis = btn.dataset.match === matchId && btn.dataset.player === playerId;
      btn.classList.toggle("selected", isThis);
      btn.classList.toggle("yuki-suggested", fromYuki && isThis);
      if (!isThis) btn.classList.remove("yuki-suggested");
      if (isThis && animate) {
        btn.classList.remove("yuki-fill");
        void btn.offsetWidth;
        btn.classList.add("yuki-fill");
      }
    });
    document.querySelectorAll(".match-card").forEach(card => {
      card.classList.toggle("has-selection", card.id === `card-${matchId}`);
    });
    updateBetSlip(matchId, playerId);
    updateBestBadgesVisibility();
  }

  /** Hide perf "Best" badges when a match has an active pick or Yuki suggestion. */
  function updateBestBadgesVisibility() {
    MATCHES.forEach(m => {
      const card = document.getElementById(`card-${m.id}`);
      if (!card) return;
      const hasFocus =
        (selectedMatchId === m.id && selectedPlayerId) ||
        (yukiPendingMatch?.id === m.id && yukiPendingPlayer);
      card.querySelectorAll(".best-pick-badge").forEach(b => {
        b.hidden = hasFocus;
      });
    });
  }

  function updateBetSlip(matchId, playerId) {
    betSlipEl = betSlipEl || document.getElementById("bet-slip");
    if (!betSlipEl) return;
    const match = MATCHES.find(m => m.id === matchId);
    const player = match?.players.find(p => p.id === playerId);
    if (!match || !player) return;

    const opponent = match.players.find(p => p.id !== playerId);
    const selEl = document.getElementById("bet-slip-selection");
    if (selEl) {
      selEl.innerHTML = `
        <div class="bet-slip-player">${player.flag} ${player.fullName}</div>
        <div class="bet-slip-match">${match.tournament} · ${match.round}</div>
        <div class="bet-slip-vs">vs ${opponent?.fullName || ""}</div>
        <div class="bet-slip-odds">@ <strong>${player.odds.toFixed(2)}</strong></div>
      `;
    }
    updateReturns();
    betSlipEl.classList.add("open");
    if (placeBtnEl) placeBtnEl.disabled = false;
  }

  function updateReturns() {
    const match  = MATCHES.find(m => m.id === selectedMatchId);
    const player = match?.players.find(p => p.id === selectedPlayerId);
    const retEl  = document.getElementById("bet-returns");
    if (!retEl || !player) return;
    retEl.textContent = (selectedChip * player.odds).toFixed(2);
  }

  function clearSelection({ resetSuggestions = false } = {}) {
    selectedMatchId = selectedPlayerId = null;
    yukiFlowState = "idle";
    yukiPendingMatch = yukiPendingPlayer = null;
    clearUserChosenPlayer();
    removeSuggestionBanner();
    document.querySelectorAll(".player-odds-btn").forEach(b => b.classList.remove("selected", "yuki-suggested", "yuki-fill"));
    document.querySelectorAll(".match-card").forEach(c => c.classList.remove("has-selection"));
    betSlipEl = betSlipEl || document.getElementById("bet-slip");
    if (betSlipEl) betSlipEl.classList.remove("open");
    if (placeBtnEl) placeBtnEl.disabled = true;
    updateBestBadgesVisibility();
    if (resetSuggestions) resetSuggestionHistory();
  }

  function bindBetSlip() {
    betSlipEl  = document.getElementById("bet-slip");
    placeBtnEl = document.getElementById("sports-place-btn");
    document.getElementById("bet-slip-clear")?.addEventListener("click", clearSelection);
    placeBtnEl?.addEventListener("click", placeBet);
    document.querySelectorAll("#sports-chips .chip-pill").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#sports-chips .chip-pill").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        selectedChip = Number(btn.dataset.chip);
        updateReturns();
      });
    });
  }

  function placeBet() {
    if (!selectedMatchId || !selectedPlayerId) return;
    const balance = window.Betting?.getBalance?.() ?? 0;
    if (balance < selectedChip) { showFlashMsg("Not enough balance!", "lose"); return; }

    const match  = MATCHES.find(m => m.id === selectedMatchId);
    const player = match?.players.find(p => p.id === selectedPlayerId);
    if (!match || !player) return;

    window.Betting?.adjustBalance(-selectedChip);

    const winChance = 1 / player.odds;
    const won = Math.random() < winChance;
    const net = won
      ? Math.round(selectedChip * player.odds * 100) / 100 - selectedChip
      : -selectedChip;

    if (won) {
      window.Betting?.adjustBalance(Math.round(selectedChip * player.odds * 100) / 100);
      showFlashMsg(`+${net.toFixed(0)} 🎾 ${player.fullName} wins!`, "win");
      bus?.emit("sports:event", { type: "WIN", payload: { net, player: player.fullName, odds: player.odds } });
    } else {
      showFlashMsg(`−${selectedChip} ${player.fullName} lost 😔`, "lose");
      bus?.emit("sports:event", { type: "LOSE", payload: { chip: selectedChip, player: player.fullName } });
    }

    clearSelection({ resetSuggestions: true });
    yukiFlowState = "idle";
  }

  function showFlashMsg(text, type) {
    let el = document.getElementById("sports-flash");
    if (!el) {
      el = document.createElement("div");
      el.id = "sports-flash";
      el.style.cssText = "position:fixed;top:60px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:12px;font-size:13px;font-weight:800;z-index:999;pointer-events:none;transition:opacity 0.4s;";
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.background = type === "win" ? "rgba(29,185,106,0.92)" : "rgba(239,68,68,0.85)";
    el.style.color = "#fff";
    el.style.opacity = "1";
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.style.opacity = "0"; }, 2800);
  }

  // ── Best player ──────────────────────────────────────────────────────────────
  function resetSuggestionHistory() {
    suggestedPlayerIds = [];
    lastSuggestedMatchId = null;
    lastSuggestedPlayerId = null;
    userChosenMatchId = null;
    userChosenPlayerId = null;
    lockedFillTarget = null;
  }

  function setUserChosenPlayer(matchId, playerId) {
    userChosenMatchId = matchId;
    userChosenPlayerId = playerId;
    if (matchId && playerId) {
      lockedFillTarget = { matchId, playerId, at: Date.now() };
    }
  }

  function clearUserChosenPlayer() {
    userChosenMatchId = null;
    userChosenPlayerId = null;
    lockedFillTarget = null;
  }

  function hasUserPlayerLock() {
    return !!(lockedFillTarget && Date.now() - lockedFillTarget.at < 120000);
  }

  function cancelPendingFill() {
    fillTimers.forEach(clearTimeout);
    fillTimers = [];
    fillGeneration += 1;
  }

  function scheduleFill(fn, ms) {
    const id = setTimeout(fn, ms);
    fillTimers.push(id);
    return id;
  }

  function findPlayerRecord(playerId) {
    for (const m of MATCHES) {
      const player = m.players.find(p => p.id === playerId);
      if (player) return { match: m, player };
    }
    return null;
  }

  function getExcludedPlayerNames() {
    return suggestedPlayerIds
      .map(id => findPlayerRecord(id)?.player.fullName)
      .filter(Boolean);
  }

  function trackSuggestedPlayer(playerId, matchId) {
    if (!playerId) return;
    if (!suggestedPlayerIds.includes(playerId)) suggestedPlayerIds.push(playerId);
    lastSuggestedPlayerId = playerId;
    lastSuggestedMatchId = matchId;
  }

  function getBestPlayer() {
    let best = null, bestScore = -1;
    MATCHES.forEach(m => {
      m.players.forEach(p => {
        if (p.perf > bestScore) { bestScore = p.perf; best = { match: m, player: p }; }
      });
    });
    return best;
  }

  function getNextSuggestedPlayer({ preferDifferentMatch = false } = {}) {
    const exclude = new Set(suggestedPlayerIds);
    const lastMatch = lastSuggestedMatchId ? MATCHES.find(m => m.id === lastSuggestedMatchId) : null;
    const candidates = [];

    MATCHES.forEach(m => {
      m.players.forEach(p => {
        if (exclude.has(p.id)) return;
        candidates.push({
          match: m,
          player: p,
          perf: p.perf,
          sameMatch: m.id === lastSuggestedMatchId,
        });
      });
    });

    if (!candidates.length) return null;

    candidates.sort((a, b) => {
      if (preferDifferentMatch && a.sameMatch !== b.sameMatch) {
        return a.sameMatch ? 1 : -1;
      }
      return b.perf - a.perf;
    });

    return { match: candidates[0].match, player: candidates[0].player };
  }

  function resolveNextPick({ preferDifferentMatch = false } = {}) {
    let pick = getNextSuggestedPlayer({ preferDifferentMatch });
    if (pick) return pick;

    if (suggestedPlayerIds.length > 1) {
      const keep = suggestedPlayerIds[suggestedPlayerIds.length - 1];
      suggestedPlayerIds = [keep];
      pick = getNextSuggestedPlayer({ preferDifferentMatch });
    }
    return pick;
  }

  function ensureMatchVisible(match) {
    if (activeTournament !== "all" && activeTournament !== match.tournament) {
      selectTournament(match.tournament, { scroll: false });
    }
  }

  function isSwitchPlayerIntent(text) {
    const t = text.toLowerCase();
    return /\b(someone else|somebody else|different player|another player|other player|other players|the other one|other one|someone different|change player|switch player|different pick|another pick|other option|someone new|anybody else|anyone else)\b/.test(t)
      || /\b(other matches|another match|different match)\b/.test(t)
      || (/\b(who else|what else)\b/.test(t) && /\b(bet|betting|pick|player|on)\b/.test(t))
      || /\blet'?s try betting on someone else\b/.test(t)
      || /\btry betting on someone else\b/.test(t)
      || /\b(not him|not her|not them)\b/.test(t)
      || /\b(bet on|pick|try|go with)\b.*\b(someone else|somebody else|different|another|other players)\b/.test(t)
      || /\bfrom (the )?(other players|other matches|another match)\b/.test(t);
  }

  function isFillSlipIntent(text) {
    const t = (text || "").toLowerCase();
    if (fuzzyFindPlayer(t) && /\b(fill|place|put)\b/.test(t)) return true;
    return /\b(fill out|fill in|fill the|fill my|fill it|fill form|fill slip|place the bet|place bet)\b/.test(t)
      || /\b(fill|place|submit|complete) (the )?(form|slip|bet)\b/.test(t)
      || /\bput .+ on (the|my) (slip|form|bet)\b/.test(t);
  }

  function isPlayerPickIntent(text) {
    const t = (text || "").toLowerCase();
    return /\b(bet|betting|pick|choose|want|back|select|take|play|go with|wager)\b/.test(t)
      || /\bbet on\b/.test(t);
  }

  function isLikelyBarePlayerUtterance(text, named) {
    const record = findPlayerRecord(named.playerId);
    if (!record) return false;
    const p = record.player;
    const stripped = (text || "").toLowerCase().replace(/[^\w\s.'-]/g, "").trim();
    const tokens = [p.fullName, p.name, p.fullName.split(" ").pop(), p.id]
      .map(s => s.toLowerCase())
      .filter(tok => tok.length >= 3)
      .sort((a, b) => b.length - a.length);

    for (const tok of tokens) {
      if (stripped === tok) return true;
      if (stripped.includes(tok) && stripped.split(/\s+/).length <= 6) return true;
    }
    return false;
  }

  function resolveFillTarget(text) {
    const spoken = text ? fuzzyFindPlayer(text) : null;
    if (spoken) {
      return { matchId: spoken.matchId, playerId: spoken.playerId };
    }

    if (lockedFillTarget && Date.now() - lockedFillTarget.at < 120000) {
      return { matchId: lockedFillTarget.matchId, playerId: lockedFillTarget.playerId };
    }

    if (userChosenPlayerId && userChosenMatchId) {
      return { matchId: userChosenMatchId, playerId: userChosenPlayerId };
    }

    const recentUser = findPlayerInRecentTurns({ roles: ["user"], limit: 6 });
    if (recentUser) {
      return { matchId: recentUser.matchId, playerId: recentUser.playerId };
    }

    const recentYuki = findPlayerInRecentTurns({ roles: ["yuki"], limit: 4 });
    if (recentYuki) {
      return { matchId: recentYuki.matchId, playerId: recentYuki.playerId };
    }

    if (yukiFlowState === "awaiting_pick_confirm" && yukiPendingMatch && yukiPendingPlayer) {
      return { matchId: yukiPendingMatch.id, playerId: yukiPendingPlayer.id };
    }
    return null;
  }

  function isConfirmIntent(text) {
    if (isSwitchPlayerIntent(text)) return false;
    if (isFillSlipIntent(text) && fuzzyFindPlayer(text)) return false;

    const spoken = fuzzyFindPlayer(text);
    if (spoken && yukiPendingPlayer && spoken.playerId !== yukiPendingPlayer.id) return false;
    if (spoken && lockedFillTarget && spoken.playerId !== lockedFillTarget.playerId) return false;

    const t = (text || "").toLowerCase();
    return /\b(yes|sure|ok|okay|go ahead|do it|confirm|fill|yep|yeah|sounds good|perfect|great)\b/.test(t)
      || /\blet'?s (do it|go|fill|place)\b/.test(t)
      || /\b(yes,? )?(fill|place) (it|the slip|bet)\b/.test(t);
  }

  function beginPlayerSuggestion(match, player) {
    trackSuggestedPlayer(player.id, match.id);
    yukiPendingMatch  = match;
    yukiPendingPlayer = player;
    yukiFlowState = "awaiting_pick_confirm";
    const opponent = match.players.find(p => p.id !== player.id);

    if (selectedMatchId === match.id && selectedPlayerId && selectedPlayerId !== player.id) {
      selectedMatchId = selectedPlayerId = null;
      betSlipEl = betSlipEl || document.getElementById("bet-slip");
      betSlipEl?.classList.remove("open");
      if (placeBtnEl) placeBtnEl.disabled = true;
      document.querySelectorAll(".player-odds-btn").forEach(btn => btn.classList.remove("selected"));
      document.querySelectorAll(".match-card").forEach(c => c.classList.remove("has-selection"));
    }

    ensureMatchVisible(match);
    showSuggestionBanner(match, player, opponent);
    document.querySelectorAll(".player-odds-btn").forEach(btn => {
      const isYuki = btn.dataset.match === match.id && btn.dataset.player === player.id;
      btn.classList.toggle("yuki-suggested", isYuki);
      if (!isYuki) btn.classList.remove("yuki-suggested");
    });
    updateBestBadgesVisibility();
  }

  // ── Player name map ──────────────────────────────────────────────────────────
  const NAME_MAP = (() => {
    const map = {};
    MATCHES.forEach(m => {
      m.players.forEach(p => {
        const last = p.fullName.split(" ").pop().toLowerCase();
        const first = p.fullName.split(" ")[0].toLowerCase();
        [p.id, p.fullName.toLowerCase(), p.name.toLowerCase(), last, first]
          .forEach(tok => { if (tok.length >= 3) map[tok] = { matchId: m.id, playerId: p.id }; });
      });
    });
    return map;
  })();

  function findPlayerByName(text) {
    const t = (text || "").toLowerCase();
    const keys = Object.keys(NAME_MAP).sort((a, b) => b.length - a.length);
    for (const key of keys) {
      if (key.length < 3) continue;
      const re = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (re.test(t)) return NAME_MAP[key];
    }
    return null;
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let prev = i;
      for (let j = 1; j <= b.length; j++) {
        const val = a[i - 1] === b[j - 1]
          ? row[j - 1]
          : Math.min(row[j] + 1, prev + 1, row[j - 1] + 1);
        row[j - 1] = prev;
        prev = val;
      }
      row[b.length] = prev;
    }
    return row[b.length];
  }

  /** STT often mis-hears these roster names — map aliases to player ids. */
  const STT_PLAYER_ALIASES = (() => {
    const map = {};
    const overrides = {
      tsitsipas: ["city pass", "cici pass", "tsiti pas", "sitsipas", "tsitsipa", "stefanos"],
      deminaur: ["deminer", "de miner", "mina ur", "deminor"],
      djokovic: ["jokovic", "jo covich"],
      alcaraz: ["alcaras", "alcarez"],
      medvedev: ["medved", "medvedeff"],
      shelton: ["sheltan", "shelten"],
      musetti: ["museti", "mussetti"],
      hurkacz: ["hur kacz", "hurkas"],
    };
    MATCHES.forEach(m => {
      m.players.forEach(p => {
        const last = p.fullName.split(" ").pop().toLowerCase();
        map[p.id] = [p.id, last, ...(overrides[p.id] || [])];
      });
    });
    return map;
  })();

  function fuzzyFindPlayer(text) {
    const exact = findPlayerByName(text);
    if (exact) return exact;

    const t = (text || "").toLowerCase();
    const phraseCandidates = [];
    const forM = t.match(/\b(?:for|on|with|about)\s+([a-z][a-z\s.'-]{2,28})/);
    if (forM) phraseCandidates.push(forM[1].trim());
    phraseCandidates.push(t);

    for (const candidate of phraseCandidates) {
      if (!candidate || candidate.length < 3) continue;
      const compact = candidate.replace(/\s+/g, "");

      for (const m of MATCHES) {
        for (const p of m.players) {
          const aliases = STT_PLAYER_ALIASES[p.id] || [];
          if (aliases.some(a => candidate.includes(a) || compact.includes(a.replace(/\s+/g, "")))) {
            return { matchId: m.id, playerId: p.id };
          }
        }
      }

      let best = null;
      let bestDist = Infinity;
      MATCHES.forEach(m => {
        m.players.forEach(p => {
          const last = p.fullName.split(" ").pop().toLowerCase();
          const dist = levenshtein(compact, last);
          const maxDist = last.length >= 9 ? 3 : last.length >= 6 ? 2 : 1;
          if (dist <= maxDist && dist < bestDist) {
            bestDist = dist;
            best = { matchId: m.id, playerId: p.id };
          }
        });
      });
      if (best) return best;
    }
    return null;
  }

  function findPlayerInRecentTurns({ roles = ["user", "yuki"], limit = 8 } = {}) {
    const turns = window.CharacterMemory?.getRecentTurns?.(limit) || [];
    for (let i = turns.length - 1; i >= 0; i--) {
      const turn = turns[i];
      if (!roles.includes(turn.role)) continue;
      const found = fuzzyFindPlayer(turn.text);
      if (found) return { ...found, fromRole: turn.role };
    }
    return null;
  }

  function getRosterMetadata() {
    return {
      tournaments: [...new Set(MATCHES.map(m => m.tournament))],
      matches: MATCHES.map(m => ({
        match_id: m.id,
        tournament: m.tournament,
        round: m.round,
        surface: m.surface,
        status: m.status,
        score: m.score,
        time: m.time,
        players: m.players.map(p => ({
          player_id: p.id,
          full_name: p.fullName,
          short_name: p.name,
          odds: p.odds,
          rank: p.rank,
          perf: Math.round(p.perf),
        })),
      })),
      player_names: MATCHES.flatMap(m => m.players.map(p => p.fullName)),
    };
  }

  function buildRosterSystemMessage() {
    const meta = getRosterMetadata();
    const lines = meta.matches.map(m => {
      const [p1, p2] = m.players;
      const status = m.status === "live"
        ? `LIVE${m.score ? ` ${m.score}` : ""}`
        : (m.time || "upcoming");
      return `${m.tournament} ${m.round} (${status}): ${p1.fullName} @ ${p1.odds.toFixed(2)} vs ${p2.fullName} @ ${p2.odds.toFixed(2)}`;
    });
    return (
      "DEMO ROSTER — ONLY these players and tournaments exist on screen. " +
      "Never suggest, mention, or fill a bet slip for anyone not listed (no Nadal, Federer, etc.). " +
      `Tournaments: ${meta.tournaments.join(", ")}. ` +
      `Available players: ${meta.player_names.join(", ")}. ` +
      `Matches: ${lines.join(" | ")}. ` +
      "If asked for someone not listed, say they are not on today's demo board and offer someone from this roster."
    );
  }

  function syncRosterToVoice() {
    window.Voice?.sendContextSilent?.(buildRosterSystemMessage());
  }

  function findUnknownPlayerMention(text) {
    const t = (text || "").toLowerCase();
    if (!/\b(bet|betting|pick|choose|back|want|wager|on)\b/.test(t)) return null;
    if (findPlayerByName(t)) return null;

    const offRoster = [
      "nadal", "federer", "kyrgios", "thiem", "wawrinka", "murray", "berrettini",
      "paolini", "swiatek", "nardi", "coco", "gauff", "osaka", "raducanu",
    ];
    for (const name of offRoster) {
      if (t.includes(name)) return name.replace(/\b\w/g, c => c.toUpperCase());
    }

    const m = t.match(/\b(?:bet on|betting on|pick|back|choose|want(?: to bet on)?)\s+(?:on\s+)?([a-z][a-z.'-]*(?:\s+[a-z][a-z.'-]*){0,2})/);
    if (m) {
      const candidate = m[1].trim();
      if (candidate.length >= 3 && !findPlayerByName(candidate)) {
        const skip = ["someone", "somebody", "anyone", "anybody", "the best", "a player", "him", "her", "them"];
        if (!skip.some(w => candidate.includes(w))) {
          return candidate.replace(/\b\w/g, c => c.toUpperCase());
        }
      }
    }
    return null;
  }

  function handleUnknownPlayerIntent(mention) {
    const names = getRosterMetadata().player_names;
    const sample = names.slice(0, 6).join(", ");
    window.Voice?.sendContext?.(
      `System: The player asked to bet on "${mention}" but that player is NOT on the demo roster. ` +
      `Only real options today: ${names.join(", ")}. ` +
      `Apologize briefly — ${mention} isn't on the board — and offer someone from the list (e.g. ${sample}). Do NOT pretend they can bet on ${mention}.`
    );
    askRouter("unknown_player", `${mention} isn't on the match list — who can I actually bet on?`, {
      unknown_player: mention,
      roster: getRosterMetadata(),
    });
  }

  // ── Inworld Router (text) + Realtime voice context ───────────────────────────
  function askRouter(intent, userContent, metadataExtra = {}) {
    if (!window.Router?.chat) return;
    const metadata = window.Router.buildBettingMetadata({ intent, ...metadataExtra });
    window.Router.chat([{ role: "user", content: userContent }], {
      metadata,
      onDone(text) {
        if (!text || window.Voice?.isConnected?.()) return;
        bus?.emit("widget:reaction", {
          reaction: { emotion: "talking", line: text.slice(0, 140) },
          type: "IDLE",
          payload: {},
        });
      },
    }).catch((err) => console.warn("[router]", err.message));
  }

  function handleBetIntent() {
    if (yukiFlowState !== "idle") return;
    resetSuggestionHistory();
    syncRosterToVoice();
    window.Voice?.sendContext?.(
      "System: The player wants to place a tennis bet. Only suggest players from the DEMO ROSTER already in context. Greet them briefly and invite them to pick a match or ask for a recommendation."
    );
    askRouter("place_bet", "The player wants to place a tennis bet. Guide them to pick a match or ask for a recommendation.");
    yukiFlowState = "idle";
  }

  function buildPickContext(player, match, opponent) {
    return `${player.fullName} (${player.flag} Rank #${player.rank}, perf ${Math.round(player.perf)}%) vs ${opponent?.fullName || "opponent"} in ${match.tournament} ${match.round}. Odds: ${player.odds.toFixed(2)}.`;
  }

  function handleBestPlayerIntent() {
    if (hasUserPlayerLock()) return;
    clearUserChosenPlayer();
    const pick = suggestedPlayerIds.length
      ? resolveNextPick({ preferDifferentMatch: false })
      : getBestPlayer();
    if (!pick) return;
    const { match, player } = pick;
    const opponent = match.players.find(p => p.id !== player.id);
    const rejected = getExcludedPlayerNames();
    beginPlayerSuggestion(match, player);
    const ctx = buildPickContext(player, match, opponent);
    const rejectLine = rejected.length ? `Do NOT suggest ${rejected.join(", ")} again. ` : "";
    window.Voice?.sendContext?.(
      `System: The player asked for a tennis pick. ${rejectLine}Recommend ONLY ${ctx} Ask if they want you to fill the bet slip.`
    );
    askRouter("best_pick", `Who is your best tennis pick right now? ${ctx}`, {
      match_id: match.id,
      player_id: player.id,
      player_name: player.fullName,
      odds: player.odds,
      tournament: match.tournament,
      rejected_players: rejected,
    });
  }

  function handleSwitchPlayerIntent() {
    clearUserChosenPlayer();
    if (yukiPendingPlayer?.id) {
      trackSuggestedPlayer(yukiPendingPlayer.id, yukiPendingMatch?.id);
    } else if (lastSuggestedPlayerId) {
      trackSuggestedPlayer(lastSuggestedPlayerId, lastSuggestedMatchId);
    }

    const pick = resolveNextPick({ preferDifferentMatch: true });
    if (!pick) return;

    const { match, player } = pick;
    const opponent = match.players.find(p => p.id !== player.id);
    const rejected = getExcludedPlayerNames();

    beginPlayerSuggestion(match, player);

    window.Voice?.sendContext?.(
      `System: The player wants someone else — preferably from another match, not the same opponent. ` +
      `${rejected.length ? `Do NOT suggest ${rejected.join(", ")} again. ` : ""}` +
      `You MUST recommend ONLY ${player.fullName} vs ${opponent?.fullName || "opponent"} ` +
      `in ${match.tournament} ${match.round} at ${player.odds.toFixed(2)}. ` +
      `Ask if they want the bet slip filled.`
    );
    askRouter("switch_player", `Let's try betting on someone else — how about ${player.fullName}?`, {
      match_id: match.id,
      player_id: player.id,
      player_name: player.fullName,
      odds: player.odds,
      tournament: match.tournament,
      rejected_players: rejected,
    });
  }

  function handleSelectAndFillPlayer(matchId, playerId) {
    const match = MATCHES.find(m => m.id === matchId);
    const player = match?.players.find(p => p.id === playerId);
    if (!match || !player) return;

    setUserChosenPlayer(matchId, playerId);
    yukiPendingMatch = match;
    yukiPendingPlayer = player;
    removeSuggestionBanner();
    ensureMatchVisible(match);
    yukiFlowState = "idle";

    autofillBet(matchId, playerId, selectedChip);

    yukiPendingMatch = yukiPendingPlayer = null;
  }

  /** Voice utterance names a roster player — pick or fill the slip for THAT player. */
  function handleVoicePlayerIntent(text) {
    const t = (text || "").toLowerCase();
    const named = fuzzyFindPlayer(t);
    if (!named) return false;

    setUserChosenPlayer(named.matchId, named.playerId);
    yukiPendingMatch = MATCHES.find(m => m.id === named.matchId);
    yukiPendingPlayer = yukiPendingMatch?.players.find(p => p.id === named.playerId) || null;

    if (isFillSlipIntent(t)) {
      handleSelectAndFillPlayer(named.matchId, named.playerId);
      return true;
    }

    if (isPlayerPickIntent(t) || isLikelyBarePlayerUtterance(t, named) || yukiFlowState !== "idle") {
      handleNamedPlayerIntent(named.matchId, named.playerId);
      return true;
    }

    return false;
  }

  function handleNamedPlayerIntent(matchId, playerId) {
    const match  = MATCHES.find(m => m.id === matchId);
    const player = match?.players.find(p => p.id === playerId);
    if (!match || !player) return;
    const opponent = match.players.find(p => p.id !== playerId);
    setUserChosenPlayer(matchId, playerId);
    beginPlayerSuggestion(match, player);
    window.Voice?.sendContext?.(
      `System: Player explicitly chose ${player.fullName} — NOT anyone else. ` +
      `${match.tournament} ${match.round} vs ${opponent?.fullName || "opponent"}. Odds: ${player.odds.toFixed(2)}. ` +
      `If they confirm, fill the bet slip for ${player.fullName} only.`
    );
    askRouter("named_player", `I want to bet on ${player.fullName} in ${match.tournament}.`, {
      match_id: matchId,
      player_id: playerId,
      player_name: player.fullName,
      odds: player.odds,
      tournament: match.tournament,
    });
  }

  function handleConfirmIntent(text) {
    const target = resolveFillTarget(text);
    if (!target) return;

    const match = MATCHES.find(m => m.id === target.matchId);
    const player = match?.players.find(p => p.id === target.playerId);
    if (!match || !player) return;

    removeSuggestionBanner();
    ensureMatchVisible(match);
    autofillBet(target.matchId, target.playerId, selectedChip);
    yukiFlowState = "idle";
    yukiPendingMatch = yukiPendingPlayer = null;
    clearUserChosenPlayer();
  }

  function autofillBet(matchId, playerId, amount) {
    cancelPendingFill();
    const gen = fillGeneration;

    const match = MATCHES.find(m => m.id === matchId);
    const player = match?.players.find(p => p.id === playerId);
    if (!match || !player) return;

    const card = document.getElementById(`card-${matchId}`);
    card?.scrollIntoView({ behavior: "smooth", block: "nearest" });

    scheduleFill(() => {
      if (gen !== fillGeneration) return;

      card?.classList.add("yuki-highlight");
      scheduleFill(() => card?.classList.remove("yuki-highlight"), 1200);

      selectOdds(matchId, playerId, { animate: true, fromYuki: true });

      document.querySelectorAll("#sports-chips .chip-pill").forEach(b => {
        const isMatch = Number(b.dataset.chip) === amount;
        b.classList.toggle("active", isMatch);
        if (isMatch) selectedChip = amount;
      });
      updateReturns();

      clearUserChosenPlayer();

      window.Voice?.sendContextSilent?.(
        `System: Bet slip is now filled for ${player.fullName} in ${match.tournament} — ${amount} chips @ ${player.odds.toFixed(2)}. ` +
        `Tell the player to tap PLACE BET. Do not mention any other player.`
      );
    }, 120);
  }

  // ── Suggestion banner ────────────────────────────────────────────────────────
  function showSuggestionBanner(match, player, opponent) {
    removeSuggestionBanner();
    const card = document.getElementById(`card-${match.id}`);
    if (!card) return;

    card.classList.add("has-yuki-suggest");

    const banner = document.createElement("div");
    banner.className = "yuki-suggest-banner";
    banner.id = "yuki-suggest-banner";
    banner.innerHTML = `
      <span class="suggest-badge" aria-hidden="true">✦</span>
      <div class="suggest-body">
        <span class="suggest-label">Yuki suggests</span>
        <span class="suggest-text"><strong>${player.fullName}</strong> @ ${player.odds.toFixed(2)}×</span>
        <span class="suggest-match">${match.tournament} · ${match.round} vs ${opponent?.name || "opponent"}</span>
      </div>
      <div class="suggest-actions">
        <button class="suggest-confirm" id="suggest-yes-btn">Yes, fill it!</button>
        <button class="suggest-dismiss" id="suggest-no-btn" aria-label="Dismiss">✕</button>
      </div>
    `;
    card.appendChild(banner);
    card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    document.getElementById("suggest-yes-btn")?.addEventListener("click", () => handleConfirmIntent());
    document.getElementById("suggest-no-btn")?.addEventListener("click", () => {
      removeSuggestionBanner();
      yukiFlowState = "idle";
      yukiPendingMatch = yukiPendingPlayer = null;
      updateBestBadgesVisibility();
    });
  }

  function removeSuggestionBanner() {
    document.getElementById("yuki-suggest-banner")?.remove();
    document.querySelectorAll(".match-card.has-yuki-suggest").forEach(c => c.classList.remove("has-yuki-suggest"));
    document.querySelectorAll(".player-odds-btn.yuki-suggested").forEach(b => b.classList.remove("yuki-suggested"));
  }

  // ── Screen lifecycle ─────────────────────────────────────────────────────────
  function startOddsTicker() {
    if (!matchesEl) render();
    if (!oddsTickInterval) oddsTickInterval = setInterval(driftOdds, 7000);
  }

  function stopOddsTicker() {
    clearInterval(oddsTickInterval);
    oddsTickInterval = null;
    removeSuggestionBanner();
  }

  bus?.on("sports:event", ({ type, payload }) => {
    const r = { WIN: { emotion: "excited", line: `${payload.player} won! 🎾` }, LOSE: { emotion: "worried", line: "Unlucky…" } }[type];
    if (!r) return;
    window.Character?.reactToOutcome?.(type === "WIN" ? "WIN" : "LOSE", payload);
    window.Voice?.notifyGameEvent?.(type === "WIN" ? "WIN" : "LOSE", { amount: payload.net || payload.chip, color: "tennis", number: payload.player });
  });

  bus?.on("betting:ready", startOddsTicker);

  bus?.on("voice:ready", syncRosterToVoice);

  bus?.on("voice:transcript", ({ text, role, partial }) => {
    if (partial || role !== "user" || !text) return;
    const found = fuzzyFindPlayer(text);
    if (found) setUserChosenPlayer(found.matchId, found.playerId);
  });

  if (window.Betting) startOddsTicker();

  window.Sports = {
    handleBetIntent,
    handleBestPlayerIntent,
    handleSwitchPlayerIntent,
    handleNamedPlayerIntent,
    handleVoicePlayerIntent,
    handleSelectAndFillPlayer,
    handleUnknownPlayerIntent,
    handleConfirmIntent,
    handleTournamentIntent,
    autofillBet,
    getBestPlayer,
    getRosterMetadata,
    buildRosterSystemMessage,
    syncRosterToVoice,
    findPlayerByName,
    findUnknownPlayerMention,
    findTournamentBySpeech,
    isTournamentNavIntent,
    isSwitchPlayerIntent,
    isConfirmIntent,
    hasUserPlayerLock,
    fuzzyFindPlayer,
    selectTournament,
    summarizeTournament,
    getActiveTournament: () => activeTournament,
    get flowState() { return yukiFlowState; },
  };
})();
