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

  const VALID_STAKES = [10, 25, 50, 100];
  let userLockedStake     = null;
  let capabilitiesIntroSent = false;

  const STAKE_WORDS = {
    ten: 10,
    twenty: 20,
    "twenty five": 25,
    twentyfive: 25,
    fifty: 50,
    hundred: 100,
    "one hundred": 100,
  };

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

    });
    refreshBetSlipOdds();
  }

  function refreshBetSlipOdds() {
    if (!selectedMatchId || !selectedPlayerId) return;
    const match = MATCHES.find(m => m.id === selectedMatchId);
    const player = match?.players.find(p => p.id === selectedPlayerId);
    if (!player) return;
    const oddsEl = document.querySelector(".bet-slip-odds strong");
    if (oddsEl) oddsEl.textContent = player.odds.toFixed(2);
    updateReturns();
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

  function getVisibleMatches() {
    return activeTournament === "all"
      ? MATCHES
      : MATCHES.filter(m => m.tournament === activeTournament);
  }

  function formatMatchLine(m) {
    const [p1, p2] = m.players;
    const status = m.status === "live"
      ? `LIVE${m.score ? ` ${m.score}` : ""}`
      : (m.time || "upcoming");
    return `${m.tournament} ${m.round} (${status}): ${p1.fullName} @ ${p1.odds.toFixed(2)} vs ${p2.fullName} @ ${p2.odds.toFixed(2)}`;
  }

  function getMatchUnderdog(match) {
    if (!match?.players?.length) return null;
    return match.players.reduce((ud, p) => {
      if (!ud) return p;
      if (p.odds > ud.odds) return p;
      if (p.odds < ud.odds) return ud;
      return p.rank > ud.rank ? p : ud;
    }, null);
  }

  function getMatchFavorite(match) {
    if (!match?.players?.length) return null;
    return match.players.reduce((fav, p) => {
      if (!fav) return p;
      if (p.odds < fav.odds) return p;
      if (p.odds > fav.odds) return fav;
      return p.rank < fav.rank ? p : fav;
    }, null);
  }

  function getUnderdogPickInView({ excludeIds = new Set() } = {}) {
    const underdogs = [];
    getVisibleMatches().forEach(m => {
      const ud = getMatchUnderdog(m);
      if (ud && !excludeIds.has(ud.id)) {
        underdogs.push({ match: m, player: ud });
      }
    });
    if (!underdogs.length) return null;
    underdogs.sort((a, b) => b.player.odds - a.player.odds || b.player.rank - a.player.rank);
    return underdogs[0];
  }

  function getFavoritePickInView({ excludeIds = new Set() } = {}) {
    const favorites = [];
    getVisibleMatches().forEach(m => {
      const fav = getMatchFavorite(m);
      if (fav && !excludeIds.has(fav.id)) {
        favorites.push({ match: m, player: fav });
      }
    });
    if (!favorites.length) return null;
    favorites.sort((a, b) => a.player.odds - b.player.odds || a.player.rank - b.player.rank);
    return favorites[0];
  }

  function classifyPickIntent(text) {
    const t = (text || "").toLowerCase();
    if (/\b(underdog|under dogs|under-dog|long\s?shot|longshot|dark horse|darkhorse|upset|plus money|the dog\b|\bdogs\b)\b/.test(t)) {
      return "underdog";
    }
    if (/\b(favorite|favourite|chalk|safe pick|likely winner|top seed|safe bet)\b/.test(t)) {
      return "favorite";
    }
    if (/\b(value|upside|smart pick|good value)\b/.test(t)) {
      return "value";
    }
    if (isSwitchPlayerIntent(text)) return "switch";
    return "best";
  }

  function isPickStrategyIntent(text) {
    if (!text || fuzzyFindPlayer(text)) return false;
    if (isTournamentNavIntent(text)) return false;
    const t = text.toLowerCase();
    const strategy = classifyPickIntent(text);
    if (strategy === "underdog" || strategy === "favorite" || strategy === "value") return true;
    return /\b(best|recommend|top|who should|suggest|your pick|who('s| is) (good|hot|playing well))\b/.test(t)
      || /\b(bet on|try to bet|try betting|wager on|let'?s bet on)\b.*\b(underdog|favorite|longshot|someone|somebody|a player|an underdog)\b/.test(t);
  }

  function resolvePickByIntent(text, { preferDifferentMatch = false } = {}) {
    const strategy = classifyPickIntent(text);
    const exclude = new Set(suggestedPlayerIds);

    if (strategy === "underdog") {
      return getUnderdogPickInView({ excludeIds: exclude })
        || getUnderdogPickInView()
        || resolveNextPick({ preferDifferentMatch: false });
    }
    if (strategy === "favorite") {
      return getFavoritePickInView({ excludeIds: exclude })
        || getFavoritePickInView()
        || getBestPlayer();
    }
    if (strategy === "switch") {
      return resolveNextPick({ preferDifferentMatch: true });
    }
    if (strategy === "value") {
      const ud = getUnderdogPickInView({ excludeIds: exclude });
      if (ud && ud.player.odds >= 2.0) return ud;
      return resolveNextPick({ preferDifferentMatch: false });
    }
    return suggestedPlayerIds.length
      ? resolveNextPick({ preferDifferentMatch: false })
      : getBestPlayer();
  }

  function getBestPlayerInView() {
    let best = null;
    let bestScore = -1;
    getVisibleMatches().forEach(m => {
      m.players.forEach(p => {
        if (p.perf > bestScore) {
          bestScore = p.perf;
          best = { match: m, player: p };
        }
      });
    });
    return best;
  }

  function getBoardState() {
    const visible = getVisibleMatches();
    const tabLabel = activeTournament === "all" ? "All Tournaments" : activeTournament;

    let betSlip = null;
    if (selectedMatchId && selectedPlayerId) {
      const match = MATCHES.find(m => m.id === selectedMatchId);
      const player = match?.players.find(p => p.id === selectedPlayerId);
      if (match && player) {
        betSlip = {
          player: player.fullName,
          player_id: player.id,
          tournament: match.tournament,
          round: match.round,
          odds: player.odds,
          stake: userLockedStake ?? selectedChip,
        };
      }
    }

    let suggestion = null;
    if (yukiPendingMatch && yukiPendingPlayer) {
      suggestion = {
        player: yukiPendingPlayer.fullName,
        player_id: yukiPendingPlayer.id,
        tournament: yukiPendingMatch.tournament,
        odds: yukiPendingPlayer.odds,
        stake: userLockedStake,
      };
    }

    const bestInView = getBestPlayerInView();
    const underdogInView = getUnderdogPickInView();

    return {
      active_tab: activeTournament,
      active_tab_label: tabLabel,
      visible_match_count: visible.length,
      visible_matches: visible.map(m => ({
        match_id: m.id,
        tournament: m.tournament,
        round: m.round,
        surface: m.surface,
        status: m.status,
        score: m.score,
        time: m.time,
        line: formatMatchLine(m),
        players: m.players.map(p => ({
          player_id: p.id,
          full_name: p.fullName,
          short_name: p.name,
          odds: p.odds,
          perf: Math.round(p.perf),
        })),
      })),
      visible_player_names: visible.flatMap(m => m.players.map(p => p.fullName)),
      best_in_view: bestInView
        ? {
            name: bestInView.player.fullName,
            player_id: bestInView.player.id,
            tournament: bestInView.match.tournament,
            odds: bestInView.player.odds,
            perf: Math.round(bestInView.player.perf),
            rank: bestInView.player.rank,
          }
        : null,
      underdog_in_view: underdogInView
        ? {
            name: underdogInView.player.fullName,
            player_id: underdogInView.player.id,
            tournament: underdogInView.match.tournament,
            odds: underdogInView.player.odds,
            rank: underdogInView.player.rank,
          }
        : null,
      bet_slip: betSlip,
      yuki_suggestion: suggestion,
      flow_state: yukiFlowState,
      all_tournaments: [...new Set(MATCHES.map(m => m.tournament))],
    };
  }

  function buildBoardStateMessage() {
    const state = getBoardState();
    const visibleLines = state.visible_matches.map(m => m.line);
    const fullRosterByTour = {};
    MATCHES.forEach(m => {
      if (!fullRosterByTour[m.tournament]) fullRosterByTour[m.tournament] = [];
      fullRosterByTour[m.tournament].push(formatMatchLine(m));
    });
    const tourSummaries = Object.entries(fullRosterByTour)
      .map(([t, lines]) => `${t}: ${lines.join("; ")}`)
      .join(" | ");

    let screen = "CURRENT SCREEN (authoritative — what the player sees NOW):\n";
    screen += `Active tab: ${state.active_tab_label}.\n`;
    if (state.active_tab === "all") {
      screen += `All ${state.visible_match_count} matches across every tournament are visible.\n`;
    } else {
      screen += `ONLY ${state.active_tab_label} is on screen (${state.visible_match_count} match${state.visible_match_count === 1 ? "" : "es"}). `;
      screen += `Do NOT recommend or discuss players from other tournaments unless the player switches tabs.\n`;
    }
    screen += `Visible matches: ${visibleLines.join(" | ") || "none"}.\n`;
    screen += `Players on screen: ${state.visible_player_names.join(", ") || "none"}.\n`;
    if (state.best_in_view) {
      screen += `Top form on this screen: ${state.best_in_view.name} (Rank #${state.best_in_view.rank}, ${state.best_in_view.tournament}) @ ${state.best_in_view.odds.toFixed(2)} — FAVORITE tier, NOT an underdog.\n`;
    }
    if (state.underdog_in_view) {
      screen += `Best underdog on this screen: ${state.underdog_in_view.name} (Rank #${state.underdog_in_view.rank}, ${state.underdog_in_view.tournament}) @ ${state.underdog_in_view.odds.toFixed(2)} — highest odds visible = underdog pick.\n`;
    }
    if (state.bet_slip) {
      screen += `Bet slip selected: ${state.bet_slip.player} @ ${state.bet_slip.odds.toFixed(2)}, stake ${state.bet_slip.stake}, ${state.bet_slip.tournament} ${state.bet_slip.round}.\n`;
    } else {
      screen += "Bet slip: empty.\n";
    }
    if (state.yuki_suggestion) {
      screen += `Yuki draft: ${state.yuki_suggestion.player} @ ${state.yuki_suggestion.odds.toFixed(2)} (${state.yuki_suggestion.tournament}).\n`;
    }
    screen += `Flow: ${state.flow_state}.\n`;

    const roster =
      "FULL DEMO ROSTER (all tabs — never invent off-list names): " +
      `${tourSummaries}. ` +
      "Tournaments available: Wimbledon, Cincinnati, Davis Cup. " +
      "When the player opens a tournament tab, ONLY discuss players listed under CURRENT SCREEN.";

    return `${screen}\n${roster}`;
  }

  function syncBoardToVoice() {
    window.Voice?.sendContextSilent?.(buildBoardStateMessage());
  }

  function selectTournament(tournamentId, { scroll = true } = {}) {
    activeTournament = tournamentId;
    const tabsEl = document.getElementById("sports-tournament-tabs");
    tabsEl?.querySelectorAll(".tour-tab").forEach(b => {
      b.classList.toggle("active", b.dataset.tour === tournamentId);
    });
    renderMatches();
    syncBoardToVoice();

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
    const tournament = findTournamentBySpeech(t);
    if (!tournament) return false;

    // Explicit bet on a named roster player — not tab navigation
    if (findPlayerByName(t) && /\b(bet|pick|choose|back|wager|stake)\b/.test(t)) return false;
    if (/\b(best|recommend|top|who should)\b/.test(t) && /\b(bet|pick)\b/.test(t)) return false;

    const NAV_CUES = /\b(check|check out|checkout|show|switch|go to|take me|see|look|what|tell|happening|going on|anything|matches|there|about|at|open|view|want to|want|browse|explore|navigate|filter|let me see|let's see|lets see)\b/;
    if (NAV_CUES.test(t)) return true;

    // Bare tournament mention with no roster player — e.g. "Davis Cup", "Wimbledon"
    if (!findPlayerByName(t) && !fuzzyFindPlayer(t)) return true;

    return false;
  }

  function handleTournamentIntent(tournamentId) {
    removeSuggestionBanner();
    yukiFlowState = "idle";
    yukiPendingMatch = yukiPendingPlayer = null;
    lockedFillTarget = null;
    clearUserChosenPlayer();

    selectedMatchId = selectedPlayerId = null;
    betSlipEl = betSlipEl || document.getElementById("bet-slip");
    betSlipEl?.classList.remove("open");
    if (placeBtnEl) placeBtnEl.disabled = true;
    document.querySelectorAll(".player-odds-btn").forEach(btn => {
      btn.classList.remove("selected", "yuki-suggested", "yuki-fill");
    });
    document.querySelectorAll(".match-card").forEach(c => c.classList.remove("has-selection"));

    selectTournament(tournamentId);

    const label = tournamentId === "all" ? "all tournaments" : tournamentId;
    const summary = summarizeTournament(tournamentId);
    syncBoardToVoice();

    window.Voice?.sendContext?.(
      `System: The player opened ${label} ONLY — stay on this tournament tab. ${summary}. ` +
      `Describe ONLY the matches now visible at ${label}. Do NOT recommend players from other tournaments. Do NOT auto-fill a bet slip.`
    );
    askRouter("tournament_nav", `What's happening at ${label}?`, {
      tournament: tournamentId,
      match_count: (tournamentId === "all" ? MATCHES : MATCHES.filter(m => m.tournament === tournamentId)).length,
      visible_player_names: getBoardState().visible_player_names,
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
<div class="match-card${selectedMatchId === m.id && selectedPlayerId ? " has-selection" : ""}" id="card-${m.id}">
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
    syncBoardToVoice();

    if (!fromYuki) {
      const match = MATCHES.find(m => m.id === matchId);
      const player = match?.players.find(p => p.id === playerId);
      if (match && player) scrollToMatchCard(matchId, playerId, { highlight: false, delay: 0 });
    }
  }

  /** Hide perf "Best" badges when a match has an active pick or Yuki suggestion. */
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
    retEl.textContent = (resolveActiveStake() * player.odds).toFixed(2);
  }

  function resolveActiveStake() {
    return userLockedStake ?? selectedChip;
  }

  function normalizeStake(amount) {
    const n = Math.round(Number(amount));
    if (!n || n < 1) return null;
    if (VALID_STAKES.includes(n)) return n;
    return n;
  }

  function parseStakeFromSpeech(text) {
    const t = (text || "").toLowerCase().trim();

    for (const [word, val] of Object.entries(STAKE_WORDS)) {
      if (new RegExp(`\\b${word.replace(/\s+/g, "\\s+")}\\b`).test(t)) {
        return normalizeStake(val);
      }
    }

    const numMatch = t.match(/(?:\$|stake|wager|bet|put|risk)\s*(\d{1,4})\b|\b(\d{1,4})\s*(?:dollars?|bucks?|chips?|credits?)\b/);
    const raw = numMatch ? (numMatch[1] || numMatch[2]) : null;
    if (raw) return normalizeStake(Number(raw));

    const bare = t.match(/\b(\d{1,4})\b/);
    if (bare) {
      const n = Number(bare[1]);
      const wordCount = t.replace(/[^\w\s]/g, " ").trim().split(/\s+/).filter(Boolean).length;
      // Short reply to "how much?" — e.g. "50", "let's do 25", "make it 100"
      if (VALID_STAKES.includes(n) && (wordCount <= 5 || /\b(stake|amount|wager|bet|put|for|make it|change|chips?|yes|ok|okay|sure|go|do)\b/.test(t))) {
        return normalizeStake(n);
      }
      if (/\b(stake|amount|wager|bet|put|for|make it|change|chips?)\b/.test(t)) {
        return normalizeStake(n);
      }
    }
    return null;
  }

  function isValidChipStake(stake) {
    return stake != null && VALID_STAKES.includes(stake);
  }

  function applyStakeToSlip(matchId, playerId, stake) {
    const match = MATCHES.find(m => m.id === matchId);
    const player = match?.players.find(p => p.id === playerId);
    if (!match || !player) return false;

    yukiPendingMatch = match;
    yukiPendingPlayer = player;
    setUserChosenPlayer(matchId, playerId);
    focusPlayerOnScreen(match, player, { highlight: true });
    selectOdds(matchId, playerId, { fromYuki: true });
    setUserLockedStake(stake);
    syncBoardToVoice();
    return true;
  }

  function sendBetFlowContextSilent(message) {
    const missing = getMissingBetFields();
    const pending = yukiPendingMatch && yukiPendingPlayer
      ? buildBetSummary(yukiPendingMatch, yukiPendingPlayer, userLockedStake)
      : null;
    const extra = [
      pending ? `Current bet draft: ${pending}.` : "",
      missing.length ? `Still needed: ${missing.join(", ")}.` : "All required fields collected.",
      userLockedStake ? `Locked stake: ${userLockedStake} — visible on bet slip chips.` : "No stake set yet.",
      `Valid stakes: ${VALID_STAKES.join(", ")}.`,
      `Screen tab: ${getBoardState().active_tab_label}.`,
    ].filter(Boolean).join(" ");
    window.Voice?.sendContextSilent?.(`System: ${message} ${extra}`);
  }

  function setUserLockedStake(amount) {
    const stake = normalizeStake(amount);
    if (!stake) return null;
    userLockedStake = stake;
    if (VALID_STAKES.includes(stake)) selectedChip = stake;
    syncStakeUI();
    return stake;
  }

  function clearUserLockedStake() {
    userLockedStake = null;
    syncStakeUI();
  }

  function resolveStakeForFill(text) {
    const parsed = text ? parseStakeFromSpeech(text) : null;
    if (parsed && VALID_STAKES.includes(parsed)) return parsed;
    if (userLockedStake && VALID_STAKES.includes(userLockedStake)) return userLockedStake;

    if (!resolveFillTarget(text)) return null;

    const t = (text || "").toLowerCase();
    const allowDefault =
      text == null ||
      text === undefined ||
      isExplicitFillOrConfirm(t) ||
      yukiFlowState === "awaiting_confirm" ||
      isFillSlipIntent(t);

    if (allowDefault) {
      return VALID_STAKES.includes(selectedChip) ? selectedChip : VALID_STAKES[1];
    }
    return null;
  }

  function isExplicitFillOrConfirm(text) {
    const t = (text || "").toLowerCase();
    return isFillSlipIntent(t)
      || /\b(yes|sure|ok|okay|yep|yeah|go ahead|do it|confirm|sounds good|perfect|great)\b/.test(t)
      || /\blet'?s (do it|go|fill|place)\b/.test(t)
      || /\b(yes,? )?(fill|place) (it|the slip|bet|form)\b/.test(t);
  }

  function canFillSlip(text) {
    return !!(resolveFillTarget(text) && resolveStakeForFill(text));
  }

  function syncStakeUI() {
    const stake = userLockedStake ?? selectedChip;
    const row = document.getElementById("bet-slip-stake-row");
    const valEl = document.getElementById("bet-slip-stake");
    if (row) row.hidden = !userLockedStake;
    if (valEl) valEl.textContent = String(stake);

    document.querySelectorAll("#sports-chips .chip-pill").forEach(b => {
      const chip = Number(b.dataset.chip);
      b.classList.toggle("active", userLockedStake ? chip === userLockedStake : chip === selectedChip);
    });
    updateReturns();
  }

  function buildBetSummary(match, player, stake) {
    const opponent = match.players.find(p => p.id !== player.id);
    const stakeVal = stake ?? userLockedStake;
    const stakePart = stakeVal
      ? `${stakeVal} chips (return ~${(stakeVal * player.odds).toFixed(2)})`
      : "stake NOT SET — ask how much to wager (10, 25, 50, or 100)";
    return `${player.fullName} · ${match.tournament} ${match.round} vs ${opponent?.fullName || "opponent"} @ ${player.odds.toFixed(2)} · ${stakePart}`;
  }

  function getMissingBetFields() {
    const missing = [];
    const hasPlayer = !!(userChosenPlayerId || yukiPendingPlayer);
    if (!hasPlayer) missing.push("player");
    if (!userLockedStake) missing.push("stake");
    return missing;
  }

  function sendBetFlowContext(message) {
    const missing = getMissingBetFields();
    const pending = yukiPendingMatch && yukiPendingPlayer
      ? buildBetSummary(yukiPendingMatch, yukiPendingPlayer, userLockedStake)
      : null;
    const extra = [
      pending ? `Current bet draft: ${pending}.` : "",
      missing.length ? `Still needed: ${missing.join(", ")}.` : "All required fields collected.",
      userLockedStake ? `Locked stake: ${userLockedStake} — do not change unless user asks.` : "No stake set yet — ask before filling.",
      `Valid stakes: ${VALID_STAKES.join(", ")}.`,
      `Screen tab: ${getBoardState().active_tab_label}.`,
    ].filter(Boolean).join(" ");
    window.Voice?.sendContext?.(`System: ${message} ${extra}`);
  }

  function syncCapabilitiesIntro() {
    if (capabilitiesIntroSent) return;
    capabilitiesIntroSent = true;
    window.Voice?.sendContextSilent?.(
      "BETTING ASSISTANT CAPABILITIES: You help with tennis sports betting on screen — discuss matches, analyze live/upcoming events, recommend roster players, prepare bet slips, set stake amounts by voice, and guide the user to tap PLACE BET. " +
      "The app has tournament tabs: All Tournaments, Wimbledon, Cincinnati, Davis Cup. Trust CURRENT SCREEN system messages for what is visible NOW — when a tab is filtered, ONLY discuss players on that tab. " +
      "When the user names a player not on screen, the app auto-switches tabs and scrolls to that player's match — then continue stake → confirm → fill flow. " +
      "When you propose a different player (e.g. 'should we go with X instead' or 'switching to X'), the app tracks that player as the pending pick — if the user says yes/sure/ok, the app switches to THAT proposed player and continues the bet flow. " +
      "Tennis knowledge: UNDERDOG = higher decimal odds and usually lower rank — never pick world #1 favorites (e.g. Sinner @ ~1.58) when the user asks for an underdog. FAVORITE = lower odds. Trust underdog_in_view / odds on screen. " +
      "Never assume player, stake, tournament, or outcome. Ask short follow-up questions for anything missing. " +
      "Before filling a slip, summarize player + stake + odds and ask for confirmation. When the user confirms or says fill, the APP fills the bet slip automatically — ONLY say it is filled after a System message containing 'Bet slip filled'. " +
      "When the user states a stake amount, the app updates the slip preview — acknowledge the amount but do NOT claim the slip is filled until that System message arrives. " +
      "If the user states a stake, preserve that exact amount. Available stakes: 10, 25, 50, 100. " +
      "Keep replies short and voice-friendly. Adapt immediately if the user interrupts or changes topic."
    );
  }

  function clearSelection({ resetSuggestions = false } = {}) {
    selectedMatchId = selectedPlayerId = null;
    yukiFlowState = "idle";
    yukiPendingMatch = yukiPendingPlayer = null;
    clearUserChosenPlayer();
    clearUserLockedStake();
    removeSuggestionBanner();
    document.querySelectorAll(".player-odds-btn").forEach(b => b.classList.remove("selected", "yuki-suggested", "yuki-fill"));
    document.querySelectorAll(".match-card").forEach(c => c.classList.remove("has-selection"));
    betSlipEl = betSlipEl || document.getElementById("bet-slip");
    if (betSlipEl) betSlipEl.classList.remove("open");
    if (placeBtnEl) placeBtnEl.disabled = true;
    updateBestBadgesVisibility();
    syncBoardToVoice();
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
        if (yukiFlowState !== "idle") setUserLockedStake(selectedChip);
        else { clearUserLockedStake(); selectedChip = Number(btn.dataset.chip); }
        syncStakeUI();
      });
    });
  }

  function placeBet() {
    const matchId = selectedMatchId;
    const playerId = selectedPlayerId;
    if (!matchId || !playerId) return;

    const match = MATCHES.find(m => m.id === matchId);
    const player = match?.players.find(p => p.id === playerId);
    if (!match || !player) return;

    const stake = resolveActiveStake();
    const balance = window.Betting?.getBalance?.() ?? 0;
    if (balance < stake) { showFlashMsg("Not enough balance!", "lose"); return; }

    if (placeBtnEl) placeBtnEl.disabled = true;

    window.Betting?.adjustBalance(-stake);

    const winChance = 1 / player.odds;
    const won = Math.random() < winChance;
    const net = won
      ? Math.round(stake * player.odds * 100) / 100 - stake
      : -stake;

    const outcome = {
      player: player.fullName,
      player_id: player.id,
      match_id: match.id,
      tournament: match.tournament,
      round: match.round,
      odds: player.odds,
      stake,
    };

    if (won) {
      window.Betting?.adjustBalance(Math.round(stake * player.odds * 100) / 100);
      showFlashMsg(`+${net.toFixed(0)} 🎾 ${player.fullName} wins!`, "win");
      bus?.emit("sports:event", { type: "WIN", payload: { ...outcome, net } });
    } else {
      showFlashMsg(`−${stake} ${player.fullName} lost 😔`, "lose");
      bus?.emit("sports:event", { type: "LOSE", payload: { ...outcome, chip: stake } });
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
    userLockedStake = null;
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
    return getBestPlayerInView();
  }

  function getNextSuggestedPlayer({ preferDifferentMatch = false } = {}) {
    const exclude = new Set(suggestedPlayerIds);
    const candidates = [];

    getVisibleMatches().forEach(m => {
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

  function getScrollTopInset(scrollArea) {
    let inset = 0;
    scrollArea.querySelectorAll(".sports-tournament-tabs, .sports-bet-type-tabs").forEach(el => {
      inset += el.offsetHeight;
    });
    return inset;
  }

  function scrollToMatchCard(matchId, playerId, { highlight = true, delay = 0 } = {}) {
    const run = () => {
      const card = document.getElementById(`card-${matchId}`);
      if (!card) return;

      const scrollArea = document.querySelector(".sports-scroll-area");
      if (scrollArea) {
        const topInset = getScrollTopInset(scrollArea);
        const areaRect = scrollArea.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        const cardTopInContent = scrollArea.scrollTop + (cardRect.top - areaRect.top);
        const maxScroll = Math.max(0, scrollArea.scrollHeight - scrollArea.clientHeight);

        // Keep match header + player odds at the top — never scroll down to chase the banner
        const targetScroll = Math.min(maxScroll, Math.max(0, cardTopInContent - topInset - 8));
        scrollArea.scrollTo({ top: targetScroll, behavior: "smooth" });
      } else {
        card.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      if (highlight) {
        card.classList.add("yuki-highlight");
        setTimeout(() => card.classList.remove("yuki-highlight"), 1400);
      }

      if (playerId) {
        const btn = document.querySelector(`[data-match="${matchId}"][data-player="${playerId}"]`);
        if (btn && highlight) {
          btn.classList.remove("yuki-fill");
          void btn.offsetWidth;
          btn.classList.add("yuki-fill");
          setTimeout(() => btn.classList.remove("yuki-fill"), 1200);
        }
      }
    };

    if (delay > 0) setTimeout(run, delay);
    else requestAnimationFrame(() => requestAnimationFrame(run));
  }

  function focusPlayerOnScreen(match, player, { highlight = true, notifyVoice = false } = {}) {
    if (!match || !player) return;

    const switchedTab =
      activeTournament !== "all" && activeTournament !== match.tournament;

    if (switchedTab) {
      selectTournament(match.tournament, { scroll: false });
      const tab = document.querySelector(`[data-tour="${match.tournament}"]`);
      tab?.classList.add("tour-tab-flash");
      setTimeout(() => tab?.classList.remove("tour-tab-flash"), 1400);
    }

    scrollToMatchCard(match.id, player.id, { highlight, delay: switchedTab ? 320 : 60 });

    if (notifyVoice || switchedTab) {
      window.Voice?.sendContextSilent?.(
        `System: Now showing ${player.fullName} — ${match.tournament} ${match.round}` +
        (switchedTab ? ` (switched to ${match.tournament} tab).` : " (scrolled to their match).") +
        " Player card is visible on screen."
      );
    }
    syncBoardToVoice();
  }

  function ensureMatchVisible(match, player) {
    if (!match) return;
    const p = player
      || (selectedPlayerId && match.players.find(pl => pl.id === selectedPlayerId))
      || match.players[0];
    focusPlayerOnScreen(match, p, { highlight: false });
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
    return /\b(fill out|fill in|fill the|fill my|fill it|fill form|fill slip|place the bet|place bet|fill for me)\b/.test(t)
      || /\b(fill|place|submit|complete) (the )?(form|slip|bet)\b/.test(t)
      || /\b(you |please )?(fill|place) (it|the slip|the form|my bet)\b/.test(t)
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

  function isYukiSwitchSpeech(text) {
    const t = (text || "").toLowerCase();
    return isSwitchProposalText(text)
      || /\b(i'?m |we'?re |let me )?switch(ing)?(\s+to|\s+over|\s+now|\s+here|\b)/.test(t)
      || /\bswitching to\b/.test(t)
      || /\b(moving|moved) (to|over to)\b/.test(t)
      || /\b(changed|changing) (pick|choice|to)\b/.test(t);
  }

  function isSwitchProposalText(text) {
    const t = (text || "").toLowerCase();
    return /\b(how about|what about|instead|rather than|someone else|different player|another player|other player|switch to|try .+ instead)\b/.test(t)
      || /\bshould we (go with|try|pick|bet on|switch)\b/.test(t)
      || /\bgo with\b/.test(t)
      || /\blet'?s (go with|try|bet on)\b/.test(t);
  }

  function isAffirmativeUtterance(text) {
    if (!text || fuzzyFindPlayer(text)) return false;
    if (isSwitchPlayerIntent(text)) return false;
    const t = text.toLowerCase();
    return /\b(yes|sure|ok|okay|go ahead|do it|confirm|fill|yep|yeah|sounds good|perfect|great)\b/.test(t)
      || /\blet'?s (do it|go|fill|place)\b/.test(t)
      || /\b(yes,? )?(fill|place) (it|the slip|bet)\b/.test(t);
  }

  function findPlayerInRecentYukiSwitch(limit = 8) {
    const turns = window.CharacterMemory?.getRecentTurns?.(limit) || [];
    for (let i = turns.length - 1; i >= 0; i--) {
      const turn = turns[i];
      if (turn.role !== "yuki") continue;
      if (!isYukiSwitchSpeech(turn.text)) continue;
      const found = fuzzyFindPlayer(turn.text);
      if (found) return { matchId: found.matchId, playerId: found.playerId };
      for (let j = i - 1; j >= 0 && j >= i - 2; j--) {
        if (turns[j].role !== "yuki") continue;
        const nearby = fuzzyFindPlayer(turns[j].text);
        if (nearby) return { matchId: nearby.matchId, playerId: nearby.playerId };
      }
    }
    return null;
  }

  function findYukiSwitchProposalPlayer() {
    return findPlayerInRecentYukiSwitch(8);
  }

  function absorbYukiSwitchProposal(text) {
    if (!isYukiSwitchSpeech(text)) return;
    let found = fuzzyFindPlayer(text);
    if (!found) {
      const recent = findPlayerInRecentYukiSwitch(8);
      if (recent) found = recent;
    }
    if (!found) return;

    const match = MATCHES.find(m => m.id === found.matchId);
    const player = match?.players.find(p => p.id === found.playerId);
    if (!match || !player) return;

    clearUserChosenPlayer();
    yukiPendingMatch = match;
    yukiPendingPlayer = player;
    trackSuggestedPlayer(player.id, match.id);
    selectOdds(match.id, player.id, { fromYuki: true });
    showBetBanner(match, player, match.players.find(p => p.id !== player.id), { suggested: true });
    scrollToMatchCard(match.id, player.id, { highlight: true, delay: 80 });
    yukiFlowState = userLockedStake ? "awaiting_confirm" : "awaiting_stake";
    syncBoardToVoice();
  }

  function resolveFillTarget(text) {
    const spoken = text ? fuzzyFindPlayer(text) : null;
    if (spoken) {
      return { matchId: spoken.matchId, playerId: spoken.playerId };
    }

    const affirmative = isAffirmativeUtterance(text);

    // Bare "yes" / "sure" — accept Yuki's pending or last spoken switch proposal
    if (affirmative && yukiPendingMatch && yukiPendingPlayer) {
      return { matchId: yukiPendingMatch.id, playerId: yukiPendingPlayer.id };
    }
    if (affirmative) {
      const fromYukiSpeech = findYukiSwitchProposalPlayer();
      if (fromYukiSpeech) return fromYukiSpeech;
    }

    if (yukiFlowState === "awaiting_confirm" && yukiPendingMatch && yukiPendingPlayer) {
      return { matchId: yukiPendingMatch.id, playerId: yukiPendingPlayer.id };
    }

    if (lockedFillTarget && Date.now() - lockedFillTarget.at < 120000) {
      return { matchId: lockedFillTarget.matchId, playerId: lockedFillTarget.playerId };
    }

    if (userChosenPlayerId && userChosenMatchId) {
      return { matchId: userChosenMatchId, playerId: userChosenPlayerId };
    }

    const recentYuki = findPlayerInRecentTurns({ roles: ["yuki"], limit: 4 });
    if (recentYuki) {
      return { matchId: recentYuki.matchId, playerId: recentYuki.playerId };
    }

    const recentUser = findPlayerInRecentTurns({ roles: ["user"], limit: 6 });
    if (recentUser) {
      return { matchId: recentUser.matchId, playerId: recentUser.playerId };
    }

    if (yukiPendingMatch && yukiPendingPlayer) {
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

    return isAffirmativeUtterance(text);
  }

  function beginPlayerSuggestion(match, player, { suggested = false, notifyVoice = false } = {}) {
    trackSuggestedPlayer(player.id, match.id);
    yukiPendingMatch  = match;
    yukiPendingPlayer = player;
    const opponent = match.players.find(p => p.id !== player.id);

    const switchedTab =
      activeTournament !== "all" && activeTournament !== match.tournament;

    if (switchedTab) {
      selectTournament(match.tournament, { scroll: false });
      const tab = document.querySelector(`[data-tour="${match.tournament}"]`);
      tab?.classList.add("tour-tab-flash");
      setTimeout(() => tab?.classList.remove("tour-tab-flash"), 1400);
    }

    selectOdds(match.id, player.id, { fromYuki: suggested });
    showBetBanner(match, player, opponent, { suggested });
    scrollToMatchCard(match.id, player.id, { highlight: true, delay: switchedTab ? 320 : 100 });

    if (notifyVoice || suggested || switchedTab) {
      window.Voice?.sendContextSilent?.(
        `System: Now showing ${player.fullName} — ${match.tournament} ${match.round}` +
        (switchedTab ? ` (switched to ${match.tournament} tab).` : " (scrolled to their match).") +
        " Player card is visible on screen."
      );
    }
    syncBoardToVoice();
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
      deminaur: ["deminer", "de miner", "mina ur", "deminor", "minaur"],
      djokovic: ["jokovic", "jo covich"],
      alcaraz: ["alcaras", "alcarez"],
      medvedev: ["medved", "medvedeff"],
      shelton: ["sheltan", "shelten"],
      musetti: ["museti", "mussetti"],
      hurkacz: ["hur kacz", "hurkas"],
      norrie: ["norry", "cam norrie"],
      rublev: ["roob lev", "rublev"],
      draper: ["drap er", "jack draper"],
      tiafoe: ["tee af o", "tia foe", "frances"],
      rune: ["holger"],
      fritz: ["taylor"],
      zverev: ["sascha", "alexander z"],
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
    const board = getBoardState();
    return {
      tournaments: board.all_tournaments,
      active_tab: board.active_tab,
      active_tab_label: board.active_tab_label,
      visible_matches: board.visible_matches,
      visible_player_names: board.visible_player_names,
      best_in_view: board.best_in_view,
      bet_slip: board.bet_slip,
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
    return buildBoardStateMessage();
  }

  function syncRosterToVoice() {
    syncBoardToVoice();
  }

  function findUnknownPlayerMention(text) {
    const t = (text || "").toLowerCase();
    if (findTournamentBySpeech(t) && isTournamentNavIntent(t)) return null;
    if (!/\b(bet|betting|pick|choose|back|wager)\b/.test(t) && !/\bwant to bet\b/.test(t)) return null;
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
    syncCapabilitiesIntro();
    if (yukiFlowState !== "idle") return;
    resetSuggestionHistory();
    syncRosterToVoice();
    sendBetFlowContext(
      "The player opened betting. Briefly explain you help with match talk, picks, stake amounts, bet slip prep, and placing bets. Ask what they want to bet on."
    );
    askRouter("place_bet", "The player wants to place a tennis bet. Explain capabilities and ask what player and stake they want.");
    yukiFlowState = "idle";
  }

  function buildPickContext(player, match, opponent, { strategy = "best" } = {}) {
    const isUnderdog = opponent && player.odds > opponent.odds;
    const isFavorite = opponent && player.odds < opponent.odds;
    let role = "pick";
    if (strategy === "underdog" || isUnderdog) {
      role = `underdog @ ${player.odds.toFixed(2)} (favorite ${opponent?.fullName} @ ${opponent?.odds.toFixed(2)})`;
    } else if (strategy === "favorite" || isFavorite) {
      role = `favorite @ ${player.odds.toFixed(2)}`;
    }
    return `${player.fullName} (${player.flag} Rank #${player.rank}, ${role}, perf ${Math.round(player.perf)}%) vs ${opponent?.fullName || "opponent"} in ${match.tournament} ${match.round}.`;
  }

  function handlePickIntent(text) {
    if (text && isTournamentNavIntent(text)) return;
    if (hasUserPlayerLock()) return;
    clearUserChosenPlayer();

    const strategy = classifyPickIntent(text);
    const pick = resolvePickByIntent(text);
    if (!pick) return;

    const { match, player } = pick;
    const opponent = match.players.find(p => p.id !== player.id);
    const rejected = getExcludedPlayerNames();
    beginPlayerSuggestion(match, player, { suggested: true });

    const ctx = buildPickContext(player, match, opponent, { strategy });
    const rejectLine = rejected.length ? `Do NOT suggest ${rejected.join(", ")} again. ` : "";
    const strategyLine = strategy === "underdog"
      ? `User asked for an UNDERDOG — ${player.fullName} is the highest-odds underdog visible (Rank #${player.rank}). Do NOT suggest favorites like Sinner or Alcaraz. `
      : strategy === "favorite"
      ? `User asked for a FAVORITE — ${player.fullName} is the strongest favorite visible. `
      : "";

    sendBetFlowContext(
      `Player asked for a ${strategy} pick. ${strategyLine}${rejectLine}Recommend ONLY ${ctx} Ask how much to wager (10, 25, 50, 100), then summarize and confirm before filling.`
    );
    askRouter(strategy === "underdog" ? "underdog_pick" : "best_pick",
      strategy === "underdog"
        ? `Who is the best underdog bet on screen right now? ${ctx}`
        : `Who is your best tennis pick right now? ${ctx}`,
      {
        match_id: match.id,
        player_id: player.id,
        player_name: player.fullName,
        odds: player.odds,
        rank: player.rank,
        tournament: match.tournament,
        pick_strategy: strategy,
        rejected_players: rejected,
        is_underdog: strategy === "underdog",
      });
  }

  function handleBestPlayerIntent(text) {
    handlePickIntent(text);
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

    beginPlayerSuggestion(match, player, { suggested: true });

    sendBetFlowContext(
      `Player wants someone else. ${rejected.length ? `Do NOT suggest ${rejected.join(", ")} again. ` : ""}` +
      `Recommend ONLY ${player.fullName} vs ${opponent?.fullName || "opponent"} in ${match.tournament} ${match.round} @ ${player.odds.toFixed(2)}. ` +
      `Ask stake amount if missing, summarize, then confirm before filling.`
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

  function handleSelectAndFillPlayer(matchId, playerId, stake) {
    const match = MATCHES.find(m => m.id === matchId);
    const player = match?.players.find(p => p.id === playerId);
    if (!match || !player) return;

    setUserChosenPlayer(matchId, playerId);
    yukiPendingMatch = match;
    yukiPendingPlayer = player;

    const fillStake = stake ?? userLockedStake;
    if (!fillStake) {
      beginPlayerSuggestion(match, player);
      sendBetFlowContext(`User chose ${player.fullName}. Their match is now on screen. Ask stake amount (10, 25, 50, 100) before filling the slip.`);
      return;
    }

    removeSuggestionBanner();
    focusPlayerOnScreen(match, player, { highlight: true });
    yukiFlowState = "idle";
    autofillBet(matchId, playerId, fillStake);
    yukiPendingMatch = yukiPendingPlayer = null;
  }

  function handleStakeIntent(text) {
    const stake = parseStakeFromSpeech(text);
    if (!stake) return false;

    if (!isValidChipStake(stake)) {
      sendBetFlowContext(`User said ${stake} but valid stakes are only ${VALID_STAKES.join(", ")}. Ask them to pick one of those.`);
      return true;
    }

    const target = resolveFillTarget(text);
    const matchId = target?.matchId ?? userChosenMatchId ?? yukiPendingMatch?.id;
    const playerId = target?.playerId ?? userChosenPlayerId ?? yukiPendingPlayer?.id;

    if (!matchId || !playerId) {
      setUserLockedStake(stake);
      yukiFlowState = "awaiting_player";
      sendBetFlowContextSilent(`User set stake to ${stake}. Ask which roster player they want.`);
      return true;
    }

    if (!applyStakeToSlip(matchId, playerId, stake)) return false;

    const match = MATCHES.find(m => m.id === matchId);
    const player = match?.players.find(p => p.id === playerId);
    const opponent = match?.players.find(p => p.id !== playerId);

    const wantsFill = isExplicitFillOrConfirm(text) || isFillSlipIntent(text);
    if (wantsFill) {
      yukiFlowState = "idle";
      removeSuggestionBanner();
      autofillBet(matchId, playerId, stake);
      yukiPendingMatch = yukiPendingPlayer = null;
      return true;
    }

    yukiFlowState = "awaiting_confirm";
    showBetBanner(match, player, opponent);
    scrollToMatchCard(matchId, playerId, { highlight: false, delay: 80 });
    sendBetFlowContextSilent(
      `Stake ${stake} applied on screen for ${player.fullName} — ${buildBetSummary(match, player, stake)}. ` +
      `Chips show ${stake} on the bet slip. Do NOT say the slip is filled yet — ask user to confirm or say fill.`
    );
    return true;
  }

  function isStakeIntent(text) {
    const stake = parseStakeFromSpeech(text);
    if (!stake) return false;
    if (fuzzyFindPlayer(text) && !/\b(on|for)\s+\d/.test(text)) return false;
    return true;
  }

  /** Voice utterance names a roster player — pick or fill the slip for THAT player. */
  function handleVoicePlayerIntent(text) {
    const t = (text || "").toLowerCase();
    if (isTournamentNavIntent(t)) return false;

    const stake = parseStakeFromSpeech(t);
    if (stake) setUserLockedStake(stake);

    const named = fuzzyFindPlayer(t);
    if (!named) return false;

    setUserChosenPlayer(named.matchId, named.playerId);
    const match = MATCHES.find(m => m.id === named.matchId);
    const player = match?.players.find(p => p.id === named.playerId);
    if (!match || !player) return false;
    yukiPendingMatch = match;
    yukiPendingPlayer = player;

    if (isFillSlipIntent(t)) {
      focusPlayerOnScreen(match, player, { highlight: true });
      handleConfirmIntent(t);
      return true;
    }

    beginPlayerSuggestion(match, player, { notifyVoice: true });
    yukiFlowState = userLockedStake ? "awaiting_confirm" : "awaiting_stake";
    if (userLockedStake) {
      sendBetFlowContextSilent(
        `User picked ${player.fullName} for ${userLockedStake} chips — now visible on screen. ${buildBetSummary(match, player, userLockedStake)}. Ask to confirm before filling.`
      );
    } else {
      sendBetFlowContext(
        `User picked ${player.fullName} — scrolled to their ${match.tournament} match on screen. Ask how much to wager (10, 25, 50, 100).`
      );
    }
    return true;
  }

  function handleNamedPlayerIntent(matchId, playerId) {
    const match  = MATCHES.find(m => m.id === matchId);
    const player = match?.players.find(p => p.id === playerId);
    if (!match || !player) return;
    setUserChosenPlayer(matchId, playerId);
    beginPlayerSuggestion(match, player);
    sendBetFlowContext(
      `Player chose ${player.fullName}. ${userLockedStake ? `Stake ${userLockedStake}. Summarize and confirm.` : "Ask stake amount (10, 25, 50, 100), then summarize and confirm before filling."}`
    );
    askRouter("named_player", `I want to bet on ${player.fullName} in ${match.tournament}.`, {
      match_id: matchId,
      player_id: playerId,
      player_name: player.fullName,
      odds: player.odds,
      tournament: match.tournament,
      stake: userLockedStake,
    });
  }

  function handleConfirmIntent(text) {
    const target = resolveFillTarget(text);
    if (!target) return;

    const match = MATCHES.find(m => m.id === target.matchId);
    const player = match?.players.find(p => p.id === target.playerId);
    if (!match || !player) return;

    selectOdds(target.matchId, target.playerId, { fromYuki: true });
    yukiPendingMatch = match;
    yukiPendingPlayer = player;

    const stake = resolveStakeForFill(text);
    if (!stake || !isValidChipStake(stake)) {
      yukiFlowState = "awaiting_stake";
      yukiPendingMatch = match;
      yukiPendingPlayer = player;
      setUserChosenPlayer(target.matchId, target.playerId);
      focusPlayerOnScreen(match, player, { highlight: true });
      applyStakeToSlip(target.matchId, target.playerId, selectedChip);
      showBetBanner(match, player, match.players.find(p => p.id !== player.id));
      sendBetFlowContext(`Player confirmed ${player.fullName} but stake is missing or invalid. Ask: 10, 25, 50, or 100?`);
      return;
    }

    setUserLockedStake(stake);
    removeSuggestionBanner();
    focusPlayerOnScreen(match, player, { highlight: true });
    autofillBet(target.matchId, target.playerId, stake);
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

    focusPlayerOnScreen(match, player, { highlight: true });

    // Update slip immediately so PLACE BET can't fire on a stale player during the animation delay
    selectOdds(matchId, playerId, { fromYuki: true });
    setUserLockedStake(amount);
    selectedChip = amount;
    syncStakeUI();
    clearUserChosenPlayer();

    window.Voice?.sendContextSilent?.(
      `System: Bet slip filled — ${player.fullName}, ${amount} chips, ${match.tournament}, return ~${(amount * player.odds).toFixed(2)}. User must tap PLACE BET.`
    );

    scheduleFill(() => {
      if (gen !== fillGeneration) return;
      scrollToMatchCard(matchId, playerId, { highlight: true, delay: 0 });
    }, 200);
  }

  // ── Bet confirmation banner ─────────────────────────────────────────────────
  function showBetBanner(match, player, opponent, { suggested = false } = {}) {
    removeSuggestionBanner();
    const slot = document.getElementById("yuki-confirm-slot");
    const card = document.getElementById(`card-${match.id}`);
    if (!slot || !card) return;

    const stake = userLockedStake ?? selectedChip;
    const stakeHtml = userLockedStake
      ? `Stake <strong>${userLockedStake}</strong> → <strong>${(userLockedStake * player.odds).toFixed(2)}</strong>`
      : `Stake <strong>${selectedChip}</strong> → <strong>${(selectedChip * player.odds).toFixed(2)}</strong>`;
    const label = suggested ? "Yuki suggests" : "Confirm your bet";

    yukiFlowState = "awaiting_confirm";
    card.classList.add("has-yuki-suggest");

    slot.hidden = false;
    slot.innerHTML = `
      <div class="yuki-suggest-banner" id="yuki-suggest-banner">
        <span class="suggest-badge" aria-hidden="true">✦</span>
        <div class="suggest-body">
          <span class="suggest-label">${label}</span>
          <span class="suggest-text"><strong>${player.fullName}</strong> @ ${player.odds.toFixed(2)}× · ${match.tournament}</span>
          <span class="suggest-stake">${stakeHtml}</span>
        </div>
        <div class="suggest-actions">
          <button class="suggest-confirm" id="suggest-yes-btn">Yes, fill slip!</button>
          <button class="suggest-dismiss" id="suggest-no-btn" aria-label="Dismiss">✕</button>
        </div>
      </div>`;

    document.getElementById("suggest-yes-btn")?.addEventListener("click", () => handleConfirmIntent());
    document.getElementById("suggest-no-btn")?.addEventListener("click", () => {
      removeSuggestionBanner();
      yukiFlowState = "idle";
      yukiPendingMatch = yukiPendingPlayer = null;
      clearUserLockedStake();
      updateBestBadgesVisibility();
    });
  }

  function removeSuggestionBanner() {
    const slot = document.getElementById("yuki-confirm-slot");
    if (slot) {
      slot.hidden = true;
      slot.innerHTML = "";
    }
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
    window.Voice?.notifyGameEvent?.(type === "WIN" ? "WIN" : "LOSE", {
      amount: payload.net ?? payload.chip,
      chip: payload.chip,
      net: payload.net,
      player: payload.player,
      tournament: payload.tournament,
      odds: payload.odds,
      stake: payload.stake,
    });
  });

  bus?.on("betting:ready", startOddsTicker);

  bus?.on("voice:ready", () => {
    syncCapabilitiesIntro();
    syncBoardToVoice();
  });

  bus?.on("voice:transcript", ({ text, role, partial }) => {
    if (partial || !text) return;
    if (role === "yuki") {
      absorbYukiSwitchProposal(text);
      return;
    }
    if (role !== "user") return;
    const found = fuzzyFindPlayer(text);
    if (found) setUserChosenPlayer(found.matchId, found.playerId);
    const stake = parseStakeFromSpeech(text);
    if (stake) setUserLockedStake(stake);
  });

  if (window.Betting) startOddsTicker();

  window.Sports = {
    handleBetIntent,
    handleBestPlayerIntent,
    handlePickIntent,
    handleSwitchPlayerIntent,
    handleNamedPlayerIntent,
    handleVoicePlayerIntent,
    handleStakeIntent,
    isStakeIntent,
    parseStakeFromSpeech,
    handleSelectAndFillPlayer,
    handleUnknownPlayerIntent,
    handleConfirmIntent,
    handleTournamentIntent,
    autofillBet,
    getBestPlayer,
    getRosterMetadata,
    buildRosterSystemMessage,
    getLockedStake: () => userLockedStake,
    getValidStakes: () => VALID_STAKES,
    getMissingBetFields,
    syncCapabilitiesIntro,
    syncRosterToVoice,
    findPlayerByName,
    findUnknownPlayerMention,
    findTournamentBySpeech,
    isTournamentNavIntent,
    isSwitchPlayerIntent,
    isPickStrategyIntent,
    classifyPickIntent,
    isConfirmIntent,
    isFillSlipIntent,
    canFillSlip,
    hasUserPlayerLock,
    fuzzyFindPlayer,
    selectTournament,
    summarizeTournament,
    getActiveTournament: () => activeTournament,
    getBoardState,
    syncBoardToVoice,
    get flowState() { return yukiFlowState; },
  };
})();
