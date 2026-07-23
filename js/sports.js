/**
 * sports.js — World Cup 2026 Round of 16 Sports Betting
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
  // ── World Cup 2026 — Round of 16 (demo bracket) ───────────────────────────
  const MATCHES = [
    {
      id: "r16_a1",
      tournament: "World Cup 2026",
      round: "Round of 16",
      bracket: "west",
      bracketLabel: "West · Match 1",
      surface: "Grass",
      venue: "MetLife Stadium",
      status: "live",
      time: null,
      score: "1-0 (67')",
      stats: { p1: { shots: 9, possession: 58, corners: 4 }, p2: { shots: 5, possession: 42, corners: 2 } },
      players: [
        { id: "argentina", name: "Argentina", fullName: "Argentina", flag: "🇦🇷", rank: 1, form: [1,1,1,1,0], baseOdds: 1.48, odds: 1.48, perf: 91, stars: ["Lionel Messi", "Julián Álvarez", "Enzo Fernández"] },
        { id: "mexico", name: "Mexico", fullName: "Mexico", flag: "🇲🇽", rank: 15, form: [1,0,1,1,0], baseOdds: 2.75, odds: 2.75, perf: 61, stars: ["Hirving Lozano", "Santiago Giménez", "Edson Álvarez"] },
      ],
    },
    {
      id: "r16_a2",
      tournament: "World Cup 2026",
      round: "Round of 16",
      bracket: "west",
      bracketLabel: "West · Match 2",
      surface: "Grass",
      venue: "SoFi Stadium",
      status: "upcoming",
      time: "Today, 21:00",
      score: null,
      stats: null,
      players: [
        { id: "france", name: "France", fullName: "France", flag: "🇫🇷", rank: 2, form: [1,1,1,0,1], baseOdds: 1.62, odds: 1.62, perf: 87, stars: ["Kylian Mbappé", "Ousmane Dembélé", "Aurélien Tchouaméni"] },
        { id: "senegal", name: "Senegal", fullName: "Senegal", flag: "🇸🇳", rank: 18, form: [1,1,0,1,1], baseOdds: 2.35, odds: 2.35, perf: 68, stars: ["Sadio Mané", "Ismaïla Sarr", "Kalidou Koulibaly"] },
      ],
    },
    {
      id: "r16_a3",
      tournament: "World Cup 2026",
      round: "Round of 16",
      bracket: "west",
      bracketLabel: "West · Match 3",
      surface: "Grass",
      venue: "AT&T Stadium",
      status: "upcoming",
      time: "Tomorrow, 18:00",
      score: null,
      stats: null,
      players: [
        { id: "brazil", name: "Brazil", fullName: "Brazil", flag: "🇧🇷", rank: 3, form: [1,1,0,1,1], baseOdds: 1.55, odds: 1.55, perf: 89, stars: ["Vinícius Júnior", "Rodrygo", "Endrick"] },
        { id: "japan", name: "Japan", fullName: "Japan", flag: "🇯🇵", rank: 16, form: [1,0,1,1,1], baseOdds: 2.50, odds: 2.50, perf: 66, stars: ["Takefusa Kubo", "Kaoru Mitoma", "Wataru Endo"] },
      ],
    },
    {
      id: "r16_a4",
      tournament: "World Cup 2026",
      round: "Round of 16",
      bracket: "west",
      bracketLabel: "West · Match 4",
      surface: "Grass",
      venue: "Hard Rock Stadium",
      status: "upcoming",
      time: "Tomorrow, 21:00",
      score: null,
      stats: null,
      players: [
        { id: "england", name: "England", fullName: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", rank: 4, form: [1,1,1,1,0], baseOdds: 1.70, odds: 1.70, perf: 84, stars: ["Harry Kane", "Jude Bellingham", "Bukayo Saka"] },
        { id: "switzerland", name: "Switzerland", fullName: "Switzerland", flag: "🇨🇭", rank: 12, form: [0,1,1,1,0], baseOdds: 2.20, odds: 2.20, perf: 70, stars: ["Xherdan Shaqiri", "Granit Xhaka", "Breel Embolo"] },
      ],
    },
    {
      id: "r16_b1",
      tournament: "World Cup 2026",
      round: "Round of 16",
      bracket: "east",
      bracketLabel: "East · Match 1",
      surface: "Grass",
      venue: "BC Place",
      status: "live",
      time: null,
      score: "0-0 (41')",
      stats: { p1: { shots: 6, possession: 54, corners: 3 }, p2: { shots: 4, possession: 46, corners: 1 } },
      players: [
        { id: "spain", name: "Spain", fullName: "Spain", flag: "🇪🇸", rank: 5, form: [1,1,1,1,1], baseOdds: 1.85, odds: 1.85, perf: 86, stars: ["Lamine Yamal", "Pedri", "Fabián Ruiz"] },
        { id: "germany", name: "Germany", fullName: "Germany", flag: "🇩🇪", rank: 6, form: [1,1,0,1,1], baseOdds: 2.00, odds: 2.00, perf: 82, stars: ["Jamal Musiala", "Florian Wirtz", "Kai Havertz"] },
      ],
    },
    {
      id: "r16_b2",
      tournament: "World Cup 2026",
      round: "Round of 16",
      bracket: "east",
      bracketLabel: "East · Match 2",
      surface: "Grass",
      venue: "Levi's Stadium",
      status: "upcoming",
      time: "Sat, 17:00",
      score: null,
      stats: null,
      players: [
        { id: "portugal", name: "Portugal", fullName: "Portugal", flag: "🇵🇹", rank: 7, form: [1,1,1,0,1], baseOdds: 1.68, odds: 1.68, perf: 83, stars: ["Cristiano Ronaldo", "Bruno Fernandes", "Rafael Leão"] },
        { id: "uruguay", name: "Uruguay", fullName: "Uruguay", flag: "🇺🇾", rank: 11, form: [1,0,1,1,0], baseOdds: 2.25, odds: 2.25, perf: 71, stars: ["Federico Valverde", "Darwin Núñez", "Ronald Araújo"] },
      ],
    },
    {
      id: "r16_b3",
      tournament: "World Cup 2026",
      round: "Round of 16",
      bracket: "east",
      bracketLabel: "East · Match 3",
      surface: "Grass",
      venue: "Gillette Stadium",
      status: "upcoming",
      time: "Sat, 20:00",
      score: null,
      stats: null,
      players: [
        { id: "netherlands", name: "Netherlands", fullName: "Netherlands", flag: "🇳🇱", rank: 8, form: [1,1,0,1,1], baseOdds: 1.95, odds: 1.95, perf: 78, stars: ["Virgil van Dijk", "Cody Gakpo", "Xavi Simons"] },
        { id: "usa", name: "USA", fullName: "United States", flag: "🇺🇸", rank: 13, form: [1,1,1,0,0], baseOdds: 1.90, odds: 1.90, perf: 74, stars: ["Christian Pulisic", "Weston McKennie", "Timothy Weah"] },
      ],
    },
    {
      id: "r16_b4",
      tournament: "World Cup 2026",
      round: "Round of 16",
      bracket: "east",
      bracketLabel: "East · Match 4",
      surface: "Grass",
      venue: "Estadio Azteca",
      status: "upcoming",
      time: "Sun, 19:00",
      score: null,
      stats: null,
      players: [
        { id: "morocco", name: "Morocco", fullName: "Morocco", flag: "🇲🇦", rank: 10, form: [1,0,1,1,1], baseOdds: 2.40, odds: 2.40, perf: 72, stars: ["Achraf Hakimi", "Youssef En-Nesyri", "Sofyan Amrabat"] },
        { id: "croatia", name: "Croatia", fullName: "Croatia", flag: "🇭🇷", rank: 9, form: [0,1,1,1,0], baseOdds: 1.62, odds: 1.62, perf: 76, stars: ["Luka Modrić", "Marcelo Brozović", "Andrej Kramarić"] },
      ],
    },
  ];

  // Normalize star names → selectable players with perf scores
  function slugifyStar(name) {
    return String(name || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function starName(star) {
    return typeof star === "string" ? star : (star?.name || "");
  }

  function teamStars(team) {
    return (team?.stars || []).map((s, i) => {
      if (typeof s === "object" && s?.name) return s;
      const name = String(s);
      const perf = Math.round(Math.min(99, Math.max(52, (team.perf || 70) - i * 5 + (i === 0 ? 5 : 0))));
      return { id: slugifyStar(name), name, perf };
    });
  }

  MATCHES.forEach(m => {
    m.players.forEach(p => { p.stars = teamStars(p); });
  });

  // Snapshot for tournament reset after the Final
  const R16_SEED = JSON.parse(JSON.stringify(MATCHES));

  /** Knockout tree — filled as Winner bets settle */
  const BRACKET = {
    cycle: 1,
    west: { qf: [null, null, null, null], sf: [null, null], finalist: null },
    east: { qf: [null, null, null, null], sf: [null, null], finalist: null },
    champion: null,
  };

  const R16_FEED = {
    r16_a1: ["west", 0], r16_a2: ["west", 1], r16_a3: ["west", 2], r16_a4: ["west", 3],
    r16_b1: ["east", 0], r16_b2: ["east", 1], r16_b3: ["east", 2], r16_b4: ["east", 3],
  };

  function cloneTeam(t) {
    if (!t) return null;
    return {
      id: t.id,
      name: t.name,
      fullName: t.fullName,
      flag: t.flag,
      rank: t.rank,
      form: Array.isArray(t.form) ? [...t.form] : [1, 1, 0, 1, 1],
      baseOdds: t.baseOdds ?? t.odds,
      odds: t.odds,
      perf: t.perf,
      stars: teamStars(t).map(s => ({ ...s })),
    };
  }

  function findTeamAnywhere(teamId) {
    for (const m of MATCHES) {
      const hit = m.players.find(p => p.id === teamId);
      if (hit) return hit;
    }
    for (const side of ["west", "east"]) {
      for (const t of BRACKET[side].qf) if (t?.id === teamId) return t;
      for (const t of BRACKET[side].sf) if (t?.id === teamId) return t;
      if (BRACKET[side].finalist?.id === teamId) return BRACKET[side].finalist;
    }
    return null;
  }

  function balanceOdds(a, b) {
    const pa = a.perf || 70;
    const pb = b.perf || 70;
    const total = pa + pb || 1;
    a.odds = Math.max(1.25, Math.round((1.15 + (pb / total) * 2.2) * 100) / 100);
    b.odds = Math.max(1.25, Math.round((1.15 + (pa / total) * 2.2) * 100) / 100);
    a.baseOdds = a.odds;
    b.baseOdds = b.odds;
  }

  function makeKnockoutMatch({ id, side, round, bracketLabel, venue, a, b }) {
    const p1 = cloneTeam(a);
    const p2 = cloneTeam(b);
    balanceOdds(p1, p2);
    return {
      id,
      tournament: "World Cup 2026",
      round,
      bracket: side,
      bracketLabel,
      surface: "Grass",
      venue,
      status: "upcoming",
      time: "Up next",
      score: null,
      stats: null,
      stage: round === "Quarter-finals" ? "qf" : round === "Semi-finals" ? "sf" : "final",
      players: [p1, p2],
      winnerId: null,
      loserId: null,
    };
  }

  function ensureMatch(id, factory) {
    if (MATCHES.some(m => m.id === id)) return;
    MATCHES.push(factory());
  }

  function unlockDownstream() {
    for (const side of ["west", "east"]) {
      const label = side === "west" ? "West" : "East";
      for (let i = 0; i < 2; i++) {
        const a = BRACKET[side].qf[i * 2];
        const b = BRACKET[side].qf[i * 2 + 1];
        if (!a || !b) continue;
        ensureMatch(`${side}_qf_${i}`, () => makeKnockoutMatch({
          id: `${side}_qf_${i}`,
          side,
          round: "Quarter-finals",
          bracketLabel: `${label} · Quarter-final ${i + 1}`,
          venue: side === "west" ? "SoFi Stadium" : "MetLife Stadium",
          a, b,
        }));
      }
      const s0 = BRACKET[side].sf[0];
      const s1 = BRACKET[side].sf[1];
      if (s0 && s1) {
        ensureMatch(`${side}_sf`, () => makeKnockoutMatch({
          id: `${side}_sf`,
          side,
          round: "Semi-finals",
          bracketLabel: `${label} · Semi-final`,
          venue: "AT&T Stadium",
          a: s0, b: s1,
        }));
      }
    }
    if (BRACKET.west.finalist && BRACKET.east.finalist) {
      ensureMatch("final", () => makeKnockoutMatch({
        id: "final",
        side: "west",
        round: "Final",
        bracketLabel: "World Cup Final · New York",
        venue: "MetLife Stadium",
        a: BRACKET.west.finalist,
        b: BRACKET.east.finalist,
      }));
    }
  }

  function generateScore(winner, loser) {
    const w = 1 + Math.floor(Math.random() * 3);
    const l = Math.floor(Math.random() * Math.min(2, w));
    // Orientation by original player order happens in settle
    return { w, l };
  }

  function advanceWinner(match, winner) {
    const w = cloneTeam(winner);
    if (!w) return null;

    let slot = null;
    if (R16_FEED[match.id]) {
      const [side, idx] = R16_FEED[match.id];
      BRACKET[side].qf[idx] = w;
      slot = `${side}-qf-${idx}`;
    } else if (/_qf_(\d)$/.test(match.id)) {
      const side = match.bracket;
      const idx = Number(match.id.slice(-1));
      BRACKET[side].sf[idx] = w;
      slot = `${side}-sf-${idx}`;
    } else if (match.id.endsWith("_sf")) {
      BRACKET[match.bracket].finalist = w;
      slot = `${match.bracket}-final`;
    } else if (match.id === "final") {
      BRACKET.champion = w;
      slot = "champion";
    }

    unlockDownstream();
    return slot;
  }

  function playBracketAdvance(fromRect, slotKey, team) {
    if (!fromRect || !slotKey || !team) return;
    const destCell = document.querySelector(`[data-bt-slot="${slotKey}"]`);
    const flagEl = destCell?.querySelector(".bt-flag");
    if (!flagEl) return;
    const capsule = destCell.closest(".bt-capsule");
    const to = flagEl.getBoundingClientRect();
    flagEl.classList.add("bt-flag--await");
    capsule?.classList.add("bt-capsule--await");

    const ghost = document.createElement("div");
    ghost.className = "bt-fly-ghost";
    ghost.setAttribute("aria-hidden", "true");
    ghost.innerHTML = `<span class="bt-fly-emoji">${team.flag}</span>`;
    ghost.style.left = `${fromRect.left}px`;
    ghost.style.top = `${fromRect.top}px`;
    ghost.style.width = `${Math.max(28, fromRect.width)}px`;
    ghost.style.height = `${Math.max(28, fromRect.height)}px`;
    document.body.appendChild(ghost);

    void ghost.offsetWidth;
    const dx = to.left + to.width / 2 - (fromRect.left + fromRect.width / 2);
    const dy = to.top + to.height / 2 - (fromRect.top + fromRect.height / 2);
    ghost.style.transform = `translate(${dx}px, ${dy}px) scale(1.2)`;

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      ghost.remove();
      flagEl.classList.remove("bt-flag--await");
      capsule?.classList.remove("bt-capsule--await");
      flagEl.classList.add("bt-flag--landed");
      capsule?.classList.add("bt-capsule--landed");
      setTimeout(() => {
        flagEl.classList.remove("bt-flag--landed");
        capsule?.classList.remove("bt-capsule--landed");
      }, 1000);
    };
    ghost.addEventListener("transitionend", finish, { once: true });
    setTimeout(finish, 750);
  }

  function resetTournament() {
    BRACKET.cycle += 1;
    BRACKET.west = { qf: [null, null, null, null], sf: [null, null], finalist: null };
    BRACKET.east = { qf: [null, null, null, null], sf: [null, null], finalist: null };
    BRACKET.champion = null;

    MATCHES.length = 0;
    const fresh = JSON.parse(JSON.stringify(R16_SEED));
    fresh.forEach(m => MATCHES.push(m));
    MATCHES.forEach(m => {
      m.players.forEach(p => { p.stars = teamStars(p); });
      m.winnerId = null;
      m.loserId = null;
    });

    selectedMatchId = selectedPlayerId = selectedStarId = null;
    showFlashMsg(`New World Cup cycle #${BRACKET.cycle} — back to Round of 16!`, "win");
    renderMatches();
    syncBoardToVoice();
  }

  function currentStageLabel() {
    if (BRACKET.champion) return "Champion crowned";
    if (MATCHES.some(m => m.id === "final" && m.status !== "final")) return "Final";
    if (MATCHES.some(m => m.stage === "sf" && m.status !== "final")) return "Semi-finals";
    if (MATCHES.some(m => m.stage === "qf" && m.status !== "final")) return "Quarter-finals";
    return "Round of 16 — paths open";
  }

  // ── State ────────────────────────────────────────────────────────────────────
  let selectedMatchId  = null;
  let selectedPlayerId = null; // team id (bet is always on the team)
  let selectedStarId   = null; // optional star lean within that team
  let selectedChip     = 25;
  let activeTournament = "all";
  let activeBetType    = "winner"; // winner | handicap | ou
  let activeView       = "matches"; // matches | bracket (phone section switch)
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
  let oddsVoicedForKey    = null;
  let awaitingYukiPickSpeechAt = 0;
  let lastPickRequestAt = 0;
  let pickRepromptCount = 0;
  let slipCommitted = false;

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
      if (m.status === "final") return;
      // Also drift live stats for live matches
      if (m.status === "live" && m.stats) {
        m.stats.p1.shots = Math.max(0, m.stats.p1.shots + (Math.random() > 0.75 ? 1 : 0));
        m.stats.p1.possession = Math.min(72, Math.max(28, m.stats.p1.possession + Math.round((Math.random()-0.5)*2)));
        m.stats.p2.shots = Math.max(0, m.stats.p2.shots + (Math.random() > 0.75 ? 1 : 0));
        m.stats.p2.possession = 100 - m.stats.p1.possession;

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

    renderViewTabs();
    renderTournamentTabs();
    applySportsView();
    renderBracket();
    renderMatches();
    bindBetSlip();
    updateBetTypeUI();
    if (!window.__sportsViewResizeBound) {
      window.__sportsViewResizeBound = true;
      window.addEventListener("resize", () => {
        applySportsView();
        renderViewTabs();
      });
    }
  }

  function isPhoneLayout() {
    return window.matchMedia("(max-width: 1099px)").matches;
  }

  function renderViewTabs() {
    const tabsEl = document.getElementById("sports-view-tabs");
    if (!tabsEl) return;
    const phone = isPhoneLayout();
    tabsEl.hidden = !phone;
    if (!phone) return;

    const views = [
      { id: "matches", label: "Matches" },
      { id: "bracket", label: "Bracket" },
    ];
    tabsEl.innerHTML = views.map(v =>
      `<button type="button" class="view-tab${v.id === activeView ? " active" : ""}" data-view="${v.id}" role="tab" aria-selected="${v.id === activeView}">
        ${v.label}
      </button>`
    ).join("");
    tabsEl.querySelectorAll(".view-tab").forEach(btn => {
      btn.addEventListener("click", () => selectView(btn.dataset.view));
    });
  }

  function selectView(viewId, { scroll = true } = {}) {
    activeView = viewId === "bracket" ? "bracket" : "matches";
    applySportsView();
    renderViewTabs();
    if (activeView === "bracket") {
      renderBracket();
      if (scroll) {
        document.getElementById("bracket-board")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      renderMatches();
    }
    syncBoardToVoice();
  }

  function applySportsView() {
    const phone = isPhoneLayout();
    const board = document.getElementById("bracket-board");
    const matches = document.getElementById("sports-matches");
    const betTypes = document.getElementById("sports-bet-type-tabs");
    const tourTabs = document.getElementById("sports-tournament-tabs");

    document.body.classList.toggle("sports-view-bracket", phone && activeView === "bracket");
    document.body.classList.toggle("sports-view-matches", phone && activeView === "matches");

    if (!phone) {
      if (board) board.hidden = false;
      if (matches) matches.hidden = false;
      if (betTypes) betTypes.hidden = false;
      if (tourTabs) tourTabs.hidden = false;
      document.body.classList.remove("sports-view-bracket", "sports-view-matches");
      return;
    }

    if (board) board.hidden = activeView !== "bracket";
    if (matches) matches.hidden = activeView !== "matches";
    if (betTypes) betTypes.hidden = activeView === "bracket";
    if (tourTabs) tourTabs.hidden = activeView === "bracket";
  }

  function renderBracket() {
    const board = document.getElementById("bracket-board");
    if (!board) return;

    const r16West = MATCHES.filter(m => m.id.startsWith("r16_a"));
    const r16East = MATCHES.filter(m => m.id.startsWith("r16_b"));

    const flagNode = (team, { size = "", live = false, out = false, advanced = false, slot = "" } = {}) => {
      if (!team) {
        return `<span class="bt-flag bt-flag--empty${size ? ` bt-flag--${size}` : ""}" title="Awaiting winner" aria-hidden="true"></span>`;
      }
      const cls = [
        "bt-flag",
        size ? `bt-flag--${size}` : "",
        live ? "is-live" : "",
        out ? "is-out" : "",
        advanced ? "is-advanced" : "",
      ].filter(Boolean).join(" ");
      return `<span class="${cls}"${slot ? ` data-bt-team="${team.id}"` : ""} title="${team.fullName}" aria-label="${team.fullName}">
        <span class="bt-flag-emoji">${team.flag}</span>
      </span>`;
    };

    const teamBtn = (team, match, opts = {}) => {
      if (!team || !match) return flagNode(null, opts);
      const out = match.winnerId && match.winnerId !== team.id;
      const advanced = match.winnerId === team.id;
      return `<button type="button" class="bt-flag${opts.size ? ` bt-flag--${opts.size}` : ""}${match.status === "live" ? " is-live" : ""}${out ? " is-out" : ""}${advanced ? " is-advanced" : ""}"
        data-match="${match.id}" data-team="${team.id}"
        title="${team.fullName}${team.odds ? ` · ${team.odds.toFixed(2)}` : ""}"
        aria-label="${team.fullName}">
        <span class="bt-flag-emoji">${team.flag}</span>
      </button>`;
    };

    const teamCell = (team, { size = "sm", slot = "", match = null, live = false } = {}) => {
      const advanced = !!team;
      const inner = match
        ? teamBtn(team, match, { size })
        : flagNode(team, { size, advanced, slot });
      return `<div class="bt-team-cell"${slot ? ` data-bt-slot="${slot}"` : ""}>
        ${inner}
        <span class="bt-team-name${team ? "" : " bt-team-name--muted"}">${team ? team.name : "TBD"}</span>
      </div>`;
    };

    const capsule = ({ children, live = false, done = false, matchId = "", filled = false, empty = false, extra = "" } = {}) =>
      `<div class="bt-capsule${live ? " is-live" : ""}${done ? " is-done" : ""}${filled ? " is-filled" : ""}${empty ? " is-empty" : ""}${extra}"${matchId ? ` data-match="${matchId}"` : ""}>
        ${children}
      </div>`;

    const r16Pair = (m) => {
      if (!m) return capsule({ empty: true, children: "" });
      const [a, b] = m.players;
      const live = m.status === "live";
      const done = m.status === "final";
      return capsule({
        live,
        done,
        matchId: m.id,
        filled: done,
        children: `
          ${live ? '<span class="bt-live-tag">LIVE</span>' : ""}
          ${done ? `<span class="bt-score-tag">${m.score || "FT"}</span>` : ""}
          <div class="bt-pair-flags">
            ${teamCell(a, { match: m })}
            ${teamCell(b, { match: m })}
          </div>`,
      });
    };

    /** Later rounds use the same capsule language as R16 */
    const roundCapsule = (teams, slots, size = "sm") => {
      const filled = teams.some(Boolean);
      const empty = !filled;
      return capsule({
        filled,
        empty,
        children: `<div class="bt-pair-flags">${teams.map((t, i) => teamCell(t, { size, slot: slots[i] })).join("")}</div>`,
      });
    };

    const sideColumn = (side, r16Matches) => {
      const tree = BRACKET[side];
      const mirror = side === "east";
      const r16Html = r16Matches.map(r16Pair).join("");
      const qfHtml = [0, 1].map(i =>
        roundCapsule(
          [tree.qf[i * 2], tree.qf[i * 2 + 1]],
          [`${side}-qf-${i * 2}`, `${side}-qf-${i * 2 + 1}`],
          "sm"
        )
      ).join("");
      const sfHtml = roundCapsule(
        [tree.sf[0], tree.sf[1]],
        [`${side}-sf-0`, `${side}-sf-1`],
        "md"
      );

      const rounds = mirror
        ? `<div class="bt-round bt-sf"><div class="bt-round-tag">SF</div>${sfHtml}</div>
           <div class="bt-rail" aria-hidden="true"></div>
           <div class="bt-round bt-qf"><div class="bt-round-tag">QF</div>${qfHtml}</div>
           <div class="bt-rail bt-rail--wide" aria-hidden="true"></div>
           <div class="bt-round bt-r16"><div class="bt-round-tag">R16</div>${r16Html}</div>`
        : `<div class="bt-round bt-r16"><div class="bt-round-tag">R16</div>${r16Html}</div>
           <div class="bt-rail bt-rail--wide" aria-hidden="true"></div>
           <div class="bt-round bt-qf"><div class="bt-round-tag">QF</div>${qfHtml}</div>
           <div class="bt-rail" aria-hidden="true"></div>
           <div class="bt-round bt-sf"><div class="bt-round-tag">SF</div>${sfHtml}</div>`;

      return `<div class="bt-side bt-${side}">
        <div class="bt-round-label">${side === "west" ? "West" : "East"}</div>
        <div class="bt-rounds${mirror ? " bt-rounds--mirror" : ""}">${rounds}</div>
      </div>`;
    };

    const finalA = BRACKET.west.finalist;
    const finalB = BRACKET.east.finalist;
    const champ = BRACKET.champion;

    board.innerHTML = `
      <div class="bracket-tree" role="img" aria-label="World Cup 2026 knockout bracket">
        <div class="bt-tree-head">
          <span class="bt-tree-kicker">FIFA World Cup 2026</span>
          <span class="bt-tree-stage">${currentStageLabel()}</span>
        </div>
        <div class="bt-tree-body">
          ${sideColumn("west", r16West)}
          <div class="bt-final${champ ? " is-crowned" : ""}">
            <div class="bt-final-title">${champ ? "CHAMPION" : "FINAL"}</div>
            <div class="bt-final-stage">
              ${champ
                ? capsule({
                    filled: true,
                    extra: " bt-capsule--champ",
                    children: `<div class="bt-pair-flags">${teamCell(champ, { size: "lg", slot: "champion" })}</div>`,
                  })
                : capsule({
                    filled: !!(finalA || finalB),
                    empty: !(finalA || finalB),
                    children: `<div class="bt-pair-flags">
                      ${teamCell(finalA, { size: "lg", slot: "west-final" })}
                      ${teamCell(finalB, { size: "lg", slot: "east-final" })}
                    </div>`,
                  })
              }
            </div>
            <div class="bt-final-meta">${champ ? `${champ.flag} lifts the trophy` : "TBD · New York"}</div>
            <div class="bt-final-note">Winner bets move teams forward · Final resets the draw</div>
          </div>
          ${sideColumn("east", r16East)}
        </div>
      </div>`;

    const focusMatch = (matchId) => {
      const card = document.getElementById(`card-${matchId}`);
      if (!card) {
        showFlashMsg("That tie is settled — follow it on the bracket", "lose");
        return;
      }
      card.scrollIntoView({ behavior: "smooth", block: "nearest" });
      card.classList.add("match-card-flash");
      setTimeout(() => card.classList.remove("match-card-flash"), 1200);
    };

    board.querySelectorAll(".bt-flag[data-match]").forEach(btn => {
      btn.addEventListener("click", () => {
        const matchId = btn.dataset.match;
        const teamId = btn.dataset.team;
        const match = MATCHES.find(m => m.id === matchId);
        if (!match || match.status === "final") {
          focusMatch(matchId);
          return;
        }
        focusMatch(matchId);
        if (teamId && activeBetType === "winner") {
          selectedStarId = null;
          selectOdds(matchId, teamId);
        }
      });
    });
    board.querySelectorAll(".bt-capsule[data-match]").forEach(pair => {
      pair.addEventListener("click", (e) => {
        if (e.target.closest(".bt-flag")) return;
        focusMatch(pair.dataset.match);
      });
    });
  }

  function renderTournamentTabs() {
    const tabsEl = document.getElementById("sports-tournament-tabs");
    if (!tabsEl) return;
    const filters = [
      { id: "all", label: "All matches" },
      { id: "live", label: "Live only" },
    ];
    const uiFilter = activeTournament === "live" ? "live" : "all";
    tabsEl.innerHTML = filters.map(t =>
      `<button class="tour-tab${t.id === uiFilter ? " active" : ""}" data-tour="${t.id}">
        ${t.label}
      </button>`
    ).join("");
    tabsEl.querySelectorAll(".tour-tab").forEach(btn => {
      btn.addEventListener("click", () => selectTournament(btn.dataset.tour));
    });
  }

  function getVisibleMatches() {
    // Settled ties live on the bracket; cards show open fixtures only
    let pool = MATCHES.filter(m => m.status !== "final");
    if (activeTournament === "live") pool = pool.filter(m => m.status === "live");
    else if (activeTournament === "west" || activeTournament === "east") {
      pool = pool.filter(m => m.bracket === activeTournament);
    }
    // Prefer later rounds first when unlocked
    const rank = (m) => (m.round === "Final" ? 0 : m.round === "Semi-finals" ? 1 : m.round === "Quarter-finals" ? 2 : 3);
    return pool.slice().sort((a, b) => rank(a) - rank(b) || String(a.id).localeCompare(b.id));
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
    if (strategy === "underdog" || strategy === "favorite" || strategy === "value" || strategy === "switch") return true;
    return /\b(best|recommend|top|who should|suggest|suggestion|your pick|who('s| is) (good|hot|playing well)|which (player|character|pick)|another (pick|suggestion|one))\b/.test(t)
      || /\b(bet on|try to bet|try betting|wager on|let'?s bet on)\b.*\b(underdog|favorite|longshot|someone|somebody|a player|an underdog)\b/.test(t);
  }

  function isVoicePickRequest(text) {
    return isPickStrategyIntent(text) || isSwitchPlayerIntent(text);
  }

  function isAwaitingYukiPickSpeech() {
    return awaitingYukiPickSpeechAt > 0 && Date.now() - awaitingYukiPickSpeechAt < 120000;
  }

  function markAwaitingYukiPickSpeech() {
    awaitingYukiPickSpeechAt = Date.now();
  }

  function preparePickSuggestion(_text) {
    lastPickRequestAt = Date.now();
    pickRepromptCount = 0;
    markAwaitingYukiPickSpeech();
    clearVoiceSuggestionPreview();
  }

  function prepareEarlyPickRequest(text) {
    if (!text || hasUserPlayerLock()) return false;
    if (!isVoicePickRequest(text)) return false;
    preparePickSuggestion(text);
    return true;
  }

  function shouldRepromptPickSpeech(clean) {
    if (!isAwaitingYukiPickSpeech()) return false;
    if (yukiPendingPlayer && yukiPendingMatch) return false;
    if (pickRepromptCount >= 1) return false;

    const raw = (clean || "").toLowerCase();
    const thoughtHeavy = /\b(?:thought|thinking)\b/.test(raw);
    const resolved = resolvePlayerFromYukiSpeech(clean);
    if (resolved) return false;

    const stripped = raw.replace(/\b(?:thought|thinking)\b/gi, "").replace(/[^\w\s]/g, "").trim();
    if (thoughtHeavy || stripped.length < 6) {
      pickRepromptCount += 1;
      return true;
    }
    return false;
  }

  function clearVoiceSuggestionPreview() {
    removeSuggestionBanner();
    yukiPendingMatch = yukiPendingPlayer = null;
    slipCommitted = false;
    selectedMatchId = selectedPlayerId = null;
    document.querySelectorAll(".player-odds-btn").forEach(b => {
      b.classList.remove("selected", "yuki-suggested", "yuki-fill");
    });
    document.querySelectorAll(".match-card").forEach(c => {
      c.classList.remove("has-selection", "has-yuki-preview", "has-yuki-suggest");
    });
    closeBetSlip();
    updateBestBadgesVisibility();
  }

  function normalizeYukiSpeechText(text) {
    let t = (text || "").trim();
    t = t.replace(/\[(?:thought|thinking|laugh|sigh|pause|speak)[^\]]*\]/gi, " ");
    t = t.replace(/\b(?:thought|thinking)\b(?:\s*[,;:–—-]?\s*)?/gi, " ");
    t = t.replace(/^(?:okay|ok|so|well),?\s*/i, "");
    return t.replace(/\s{2,}/g, " ").trim();
  }

  function clearAwaitingYukiPickSpeech() {
    awaitingYukiPickSpeechAt = 0;
  }

  function userAskedRecommendationRecently() {
    const turns = window.CharacterMemory?.getRecentTurns?.(6) || [];
    for (let i = turns.length - 1; i >= 0; i--) {
      if (turns[i].role !== "user") continue;
      return isVoicePickRequest(turns[i].text);
    }
    return false;
  }

  function sendVoicePickContext(text, { strategy = "best" } = {}) {
    const rejected = getExcludedPlayerNames();
    const rejectLine = rejected.length ? `Do NOT suggest ${rejected.join(", ")} again. ` : "";
    const board = getBoardState();
    const visibleNames = board.visible_player_names.join(", ") || "none";
    const strategyNote = strategy === "underdog"
      ? "They want an UNDERDOG — pick highest odds on screen, not a favorite."
      : strategy === "favorite"
      ? "They want a FAVORITE — pick lowest odds / top seed on screen."
      : strategy === "switch"
      ? "They want a DIFFERENT player than before."
      : "They want your best pick on screen.";

    sendBetFlowContext(
      `Voice pick (${strategy}). ${rejectLine}${strategyNote} ` +
      `Visible: ${visibleNames}. ` +
      `Reply FAST. First words MUST be "How about [exact roster team name]". ` +
      `Then ONE short football reason (star or style). No odds-first. No certainty. Under 18 words. ` +
      `Do NOT mention any other team name in this reply — only the one pick.`,
      { includeOddsInSummary: false, forceResponse: true }
    );
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
    const tabLabel =
      activeTournament === "all" ? "All matches"
      : activeTournament === "live" ? "Live only"
      : activeTournament === "west" ? "West side"
      : activeTournament === "east" ? "East side"
      : activeTournament;

    let betSlip = null;
    if (slipCommitted && selectedMatchId && selectedPlayerId) {
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
    const userName = window.CharacterMemory?.getUserName?.() || null;

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
      user_name: userName,
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
    const userName = window.CharacterMemory?.getUserName?.();
    if (userName) {
      screen += `USER_NAME: ${userName} — use occasionally, friendly tone.\n`;
    } else {
      screen += "USER_NAME: unknown — ask what to call them if not asked yet.\n";
    }
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
      screen += `Bet slip selected: ${state.bet_slip.player}, stake ${state.bet_slip.stake}, ${state.bet_slip.tournament} ${state.bet_slip.round}. Odds on screen — do not repeat in speech.\n`;
    } else {
      screen += "Bet slip: hidden until user confirms fill.\n";
    }
    if (state.yuki_suggestion) {
      const stakeNote = state.yuki_suggestion.stake
        ? `, stake ${state.yuki_suggestion.stake} chips`
        : ", stake not set yet";
      screen += `Yuki draft: ${state.yuki_suggestion.player} (${state.yuki_suggestion.tournament}${stakeNote}). Odds on screen — do not repeat in speech.\n`;
    }
    screen += `${describeFlowStep()}\n`;

    const starBook = MATCHES.map(m =>
      m.players.map(p => `${p.fullName}: ${teamStars(p).map(s => s.name).join(", ")}`).join("; ")
    ).join(" | ");

    // Compact dossiers (one line each) — full prose only for the pending/suggested team.
    const compactDossiers = MATCHES.flatMap((m) =>
      m.players.map((p) => {
        const k = window.YukiTeamKnowledge?.getTeamKnowledge?.(p.id);
        if (!k) return null;
        return `${p.fullName}: ${k.nickname}; stars — ${k.starsWhy.split(";")[0] || k.starsWhy}; edge — ${k.edge}`;
      })
    ).filter(Boolean).join(" | ");

    const focusTeam = state.yuki_suggestion?.player
      || state.bet_slip?.player
      || null;
    let focusDossier = "";
    if (focusTeam) {
      const team = MATCHES.flatMap((m) => m.players).find(
        (p) => p.fullName === focusTeam || p.name === focusTeam
      );
      const full = team && window.YukiTeamKnowledge?.formatTeamDossier?.(team);
      if (full) focusDossier = `FOCUS TEAM DOSSIER: ${full}. `;
    }

    const roster =
      "FULL DEMO ROSTER — World Cup 2026 Round of 16 teams only (never invent off-list nations): " +
      `${tourSummaries}. ` +
      "STAR PLAYERS: " +
      `${starBook}. ` +
      (compactDossiers ? `TEAM SNAPSHOTS: ${compactDossiers}. ` : "") +
      focusDossier +
      "ADVISER RULE: NEVER claim certainty. Lead with team/stars lore; odds secondary. " +
      "On WHY questions, use TEAM SNAPSHOTS / FOCUS TEAM DOSSIER (2–4 short sentences). " +
      "When a filter is active, ONLY discuss teams listed under CURRENT SCREEN.";

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

    const pool = getVisibleMatches();
    const target = pool.find(m => m.status === "live") || pool[0];
    if (target) {
      setTimeout(() => {
        document.getElementById(`card-${target.id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 280);
    }
  }

  function summarizeTournament(tournamentId) {
    const prev = activeTournament;
    activeTournament = tournamentId;
    const pool = getVisibleMatches();
    activeTournament = prev;
    if (!pool.length) return "No matches listed right now.";
    return pool.map(m => {
      const [p1, p2] = m.players;
      const status = m.status === "live"
        ? `LIVE now, score ${m.score}`
        : `upcoming ${m.time || "soon"}`;
      const stars = [...teamStars(p1).slice(0, 2), ...teamStars(p2).slice(0, 2)]
        .map(s => s.name)
        .join(", ");
      return `${m.bracketLabel || m.round}: ${p1.fullName} vs ${p2.fullName} (${status}, odds ${p1.odds.toFixed(2)} / ${p2.odds.toFixed(2)}; stars: ${stars})`;
    }).join(". ");
  }

  function findTournamentBySpeech(text) {
    const t = (text || "").toLowerCase();
    if (/\b(bracket|tree|knockout)\b/.test(t) && !/\bfull bracket\b/.test(t)) {
      selectView("bracket", { scroll: true });
      return "all";
    }
    if (/\b(full bracket|all matches|whole bracket|entire bracket|show all|matches)\b/.test(t)) {
      if (isPhoneLayout()) selectView("matches", { scroll: false });
      return "all";
    }
    if (/\b(west|left) (bracket|side)?\b/.test(t) || /\bwest bracket\b/.test(t)) return "west";
    if (/\b(east|right) (bracket|side)?\b/.test(t) || /\beast bracket\b/.test(t)) return "east";
    if (/\blive\b/.test(t)) return "live";
    if (/\b(world cup|wc ?2026|fifa)\b/.test(t)) return "all";
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

    // Bare bracket mention with no roster team — e.g. "West bracket", "World Cup"
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
    const visible = getVisibleMatches();
    matchesEl.innerHTML = visible.map(m => renderMatchCard(m)).join("");
    renderBracket();

    matchesEl.querySelectorAll(".player-odds-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        selectedStarId = null;
        selectOdds(btn.dataset.match, btn.dataset.player);
      });
    });
    matchesEl.querySelectorAll(".star-chip").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        selectStar(btn.dataset.match, btn.dataset.team, btn.dataset.star);
      });
    });
    updateBestBadgesVisibility();
  }

  function selectStar(matchId, teamId, starId) {
    selectedStarId = starId;
    selectOdds(matchId, teamId, { animate: true });
    document.querySelectorAll(".star-chip").forEach(chip => {
      const on = chip.dataset.match === matchId && chip.dataset.star === starId;
      chip.classList.toggle("selected", on);
    });
  }

  function buildStatsRowHTML(m) {
    const { p1, p2 } = m.stats;
    return `
      <span class="stat-item"><span class="stat-val">${p1.shots}</span><span class="stat-key">SHOTS</span><span class="stat-val">${p2.shots}</span></span>
      <span class="stat-divider"></span>
      <span class="stat-item"><span class="stat-val">${p1.possession}%</span><span class="stat-key">POSS</span><span class="stat-val">${p2.possession}%</span></span>
      <span class="stat-divider"></span>
      <span class="stat-item"><span class="stat-val">${p1.corners}</span><span class="stat-key">CRN</span><span class="stat-val">${p2.corners}</span></span>
    `;
  }

  function bestStarsInMatch(m) {
    const all = m.players.flatMap(p => teamStars(p).map(s => ({ ...s, teamId: p.id })));
    if (!all.length) return new Set();
    const top = Math.max(...all.map(s => s.perf));
    return new Set(all.filter(s => s.perf >= top - 1).map(s => s.id));
  }

  function renderStarPicks(m) {
    if (activeBetType !== "winner") return "";
    const bestIds = bestStarsInMatch(m);
    const col = (team) => {
      const stars = teamStars(team);
      return `<div class="star-col">
        <div class="star-col-head">${team.flag} ${team.name}</div>
        <div class="star-chips">
          ${stars.map(s => {
            const isBest = bestIds.has(s.id);
            const isSel = selectedMatchId === m.id && selectedStarId === s.id;
            return `<button type="button" class="star-chip${isBest ? " is-best" : ""}${isSel ? " selected" : ""}" data-match="${m.id}" data-team="${team.id}" data-star="${s.id}" title="Lean ${s.name} — bet stays on ${team.name}">
              ${isBest ? '<span class="star-best-tag">Best</span>' : ""}
              <span class="star-chip-name">${s.name}</span>
              <span class="star-chip-perf">${s.perf}</span>
            </button>`;
          }).join("")}
        </div>
      </div>`;
    };
    return `<div class="star-picks" aria-label="Pick a standout player">
      <div class="star-picks-label">Standout players · tap to lean</div>
      <div class="star-picks-grid">
        ${col(m.players[0])}
        ${col(m.players[1])}
      </div>
    </div>`;
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

    // O/U 2.5 and BTTS odds derived from base odds
    const p1HandicapOdds = "1.90"; // Over 2.5
    const p2HandicapOdds = "1.90"; // Under 2.5
    const ouOverOdds  = "1.80"; // BTTS Yes
    const ouUnderOdds = "2.00"; // BTTS No

    const oddsSection = activeBetType === "winner" ? `
      <button class="player-odds-btn${sel1}${yuki1}" data-match="${m.id}" data-player="${p1.id}">
        ${showBestBadge(p1) ? '<span class="best-pick-badge">Best form</span>' : ""}
        <span class="player-flag">${p1.flag}</span>
        <span class="player-name">${p1.name}</span>
        <span class="player-rank">#${p1.rank}</span>
        <span class="player-odds-val">${p1.odds.toFixed(2)}</span>
        <span class="player-form">${formDots(p1)}</span>
        ${perfBar(p1)}
      </button>
      <div class="match-vs-col"><span class="match-vs">VS</span>${scoreOrTime}</div>
      <button class="player-odds-btn${sel2}${yuki2}" data-match="${m.id}" data-player="${p2.id}">
        ${showBestBadge(p2) ? '<span class="best-pick-badge">Best form</span>' : ""}
        <span class="player-flag">${p2.flag}</span>
        <span class="player-name">${p2.name}</span>
        <span class="player-rank">#${p2.rank}</span>
        <span class="player-odds-val">${p2.odds.toFixed(2)}</span>
        <span class="player-form">${formDots(p2)}</span>
        ${perfBar(p2)}
      </button>
    ` : activeBetType === "handicap" ? `
      <button class="player-odds-btn handicap${sel1}" data-match="${m.id}" data-player="${p1.id}">
        <span class="player-flag">⬆️</span>
        <span class="player-name">Over 2.5</span>
        <span class="player-odds-val">${p1HandicapOdds}</span>
      </button>
      <div class="match-vs-col"><span class="match-vs">O/U</span></div>
      <button class="player-odds-btn handicap${sel2}" data-match="${m.id}" data-player="${p2.id}">
        <span class="player-flag">⬇️</span>
        <span class="player-name">Under 2.5</span>
        <span class="player-odds-val">${p2HandicapOdds}</span>
      </button>
    ` : `
      <button class="player-odds-btn ou${sel1}" data-match="${m.id}" data-player="${p1.id}">
        <span class="player-name">BTTS Yes</span>
        <span class="player-odds-val">${ouOverOdds}</span>
      </button>
      <div class="match-vs-col"><span class="match-vs">BTTS</span></div>
      <button class="player-odds-btn ou${sel2}" data-match="${m.id}" data-player="${p2.id}">
        <span class="player-name">BTTS No</span>
        <span class="player-odds-val">${ouUnderOdds}</span>
      </button>
    `;

    const sideLabel = m.bracket === "west" ? "West" : "East";

    return `
<div class="match-card${selectedMatchId === m.id && selectedPlayerId ? " has-selection" : ""}" id="card-${m.id}">
  <div class="match-header">
    <span class="match-tournament">${sideLabel} · ${m.venue || "R16"}</span>
    <span class="match-round">${m.round}</span>
    ${badge}
  </div>
  <div class="match-players">${oddsSection}</div>
  ${renderStarPicks(m)}
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
  function selectOdds(matchId, playerId, { animate = false, fromYuki = false, openSlip } = {}) {
    const shouldOpenSlip = openSlip ?? !fromYuki;
    selectedMatchId  = matchId;
    selectedPlayerId = playerId;
    // Keep star lean only if it belongs to this team
    if (selectedStarId) {
      const match = MATCHES.find(m => m.id === matchId);
      const team = match?.players.find(p => p.id === playerId);
      const stillValid = teamStars(team).some(s => s.id === selectedStarId);
      if (!stillValid) selectedStarId = null;
    }

    if (!fromYuki) {
      removeSuggestionBanner();
      slipCommitted = shouldOpenSlip;
      if (yukiPendingPlayer?.id !== playerId || yukiPendingMatch?.id !== matchId) {
        yukiFlowState = "idle";
        yukiPendingMatch = yukiPendingPlayer = null;
      }
    }

    document.querySelectorAll(".player-odds-btn").forEach(btn => {
      const isThis = btn.dataset.match === matchId && btn.dataset.player === playerId;
      btn.classList.toggle("selected", isThis && (slipCommitted || !fromYuki));
      btn.classList.toggle("yuki-suggested", fromYuki && isThis && !slipCommitted);
      if (!isThis) btn.classList.remove("yuki-suggested");
      if (isThis && animate) {
        btn.classList.remove("yuki-fill");
        void btn.offsetWidth;
        btn.classList.add("yuki-fill");
      }
    });
    document.querySelectorAll(".star-chip").forEach(chip => {
      const on = chip.dataset.match === matchId && chip.dataset.star === selectedStarId;
      chip.classList.toggle("selected", !!on);
    });
    document.querySelectorAll(".match-card").forEach(card => {
      card.classList.toggle("has-selection", slipCommitted && card.id === `card-${matchId}`);
      card.classList.toggle("has-yuki-preview", fromYuki && !slipCommitted && card.id === `card-${matchId}`);
    });
    if (shouldOpenSlip) {
      updateBetSlip(matchId, playerId);
    } else {
      closeBetSlip();
    }
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

  function closeBetSlip() {
    betSlipEl = betSlipEl || document.getElementById("bet-slip");
    if (betSlipEl) betSlipEl.classList.remove("open");
    if (placeBtnEl) placeBtnEl.disabled = true;
  }

  function updateBetSlip(matchId, playerId) {
    betSlipEl = betSlipEl || document.getElementById("bet-slip");
    if (!betSlipEl) return;
    const match = MATCHES.find(m => m.id === matchId);
    const player = match?.players.find(p => p.id === playerId);
    if (!match || !player) return;

    const opponent = match.players.find(p => p.id !== playerId);
    const stake = resolveActiveStake();
    const potential = (stake * player.odds).toFixed(2);
    const lean = selectedStarId
      ? teamStars(player).find(s => s.id === selectedStarId)
      : null;
    const side = match.bracket === "west" ? "West" : "East";
    const selEl = document.getElementById("bet-slip-selection");
    if (selEl) {
      selEl.innerHTML = `
        <div class="slip-pick-card">
          <div class="slip-pick-kicker">Your pick</div>
          <div class="slip-pick-team">${player.flag} <strong>${player.fullName}</strong></div>
          <div class="slip-pick-vs">to beat ${opponent?.flag || ""} ${opponent?.fullName || "opponent"}</div>
          ${lean ? `<div class="slip-pick-lean">Leaning <strong>${lean.name}</strong></div>` : ""}
          <div class="slip-pick-meta">
            <span class="slip-pick-round">${side} · ${match.round}</span>
            <span class="slip-pick-odds">${player.odds.toFixed(2)}</span>
          </div>
          <div class="slip-pick-math">
            <span>Stake <strong>${stake}</strong></span>
            <span class="slip-pick-arrow">→</span>
            <span>Return <strong>${potential}</strong></span>
          </div>
        </div>
      `;
    }
    updateReturns();
    betSlipEl.classList.add("open");
    slipCommitted = true;
    if (placeBtnEl) placeBtnEl.disabled = false;
    document.querySelectorAll(".match-card").forEach(card => {
      card.classList.toggle("has-yuki-preview", false);
      card.classList.toggle("has-selection", card.id === `card-${matchId}`);
    });
    document.querySelectorAll(".player-odds-btn").forEach(btn => {
      const isThis = btn.dataset.match === matchId && btn.dataset.player === playerId;
      if (isThis) {
        btn.classList.add("selected");
        btn.classList.remove("yuki-suggested");
      }
    });
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

  /** Parse stake when Yuki suggests it alongside a player (e.g. "Tiafoe for 25 chips"). */
  function parseYukiSuggestedStake(text) {
    const fromSpeech = parseStakeFromSpeech(text);
    if (fromSpeech && VALID_STAKES.includes(fromSpeech)) return fromSpeech;

    const t = (text || "").toLowerCase();
    const candidates = [];
    const patterns = [
      /\b(?:for|at|with|wager|risk|put|bet|do|try|go|make it)\s+(\d{1,3})\b/g,
      /\b(\d{1,3})\s+(?:chips?|credits?)\b/g,
    ];
    for (const re of patterns) {
      let m;
      while ((m = re.exec(t))) {
        const n = normalizeStake(Number(m[1]));
        if (VALID_STAKES.includes(n)) candidates.push(n);
      }
    }
    return candidates.length ? candidates[candidates.length - 1] : null;
  }

  function applyStakeToSuggestionPreview(stake, { match, player, fromYuki = true } = {}) {
    if (!isValidChipStake(stake)) return false;
    const m = match ?? yukiPendingMatch;
    const p = player ?? yukiPendingPlayer;
    if (!m || !p) return false;

    setUserLockedStake(stake);
    if (!slipCommitted) {
      selectOdds(m.id, p.id, { fromYuki, openSlip: false });
      showBetBanner(m, p, m.players.find(pl => pl.id !== p.id), { suggested: true });
    }
    yukiFlowState = "awaiting_confirm";
    syncBoardToVoice();
    return true;
  }

  function applyStakeToSlip(matchId, playerId, stake) {
    const match = MATCHES.find(m => m.id === matchId);
    const player = match?.players.find(p => p.id === playerId);
    if (!match || !player) return false;

    yukiPendingMatch = match;
    yukiPendingPlayer = player;
    setUserChosenPlayer(matchId, playerId);
    setUserLockedStake(stake);
    if (!slipCommitted) {
      selectOdds(matchId, playerId, { fromYuki: true, openSlip: false });
      showBetBanner(match, player, match.players.find(p => p.id !== playerId), { suggested: true });
    } else {
      selectOdds(matchId, playerId, { fromYuki: true, openSlip: true });
    }
    syncBoardToVoice();
    return true;
  }

  function playerFlowKey(matchId, playerId) {
    return matchId && playerId ? `${matchId}:${playerId}` : null;
  }

  function canVoiceOdds(matchId, playerId) {
    const key = playerFlowKey(matchId, playerId);
    return !key || oddsVoicedForKey !== key;
  }

  function markOddsVoiced(matchId, playerId) {
    const key = playerFlowKey(matchId, playerId);
    if (key) oddsVoicedForKey = key;
  }

  function clearOddsVoiced() {
    oddsVoicedForKey = null;
  }

  function noRepeatOddsHint(matchId, playerId) {
    if (!matchId || !playerId || canVoiceOdds(matchId, playerId)) return "";
    if (yukiFlowState === "awaiting_confirm") {
      return "Confirming selection — do NOT repeat odds, percentages, perf stats, or potential return. Player name and stake only.";
    }
    return "Player locked on screen — do NOT repeat odds, percentages, perf stats, or potential return unless the user asks.";
  }

  function describeFlowStep() {
    const player = yukiPendingPlayer?.fullName;
    switch (yukiFlowState) {
      case "awaiting_stake":
        return player
          ? `WORKFLOW — Phase 1 (suggestion): ${player} is highlighted on screen. Bet slip is HIDDEN. Ask stake only: 10, 25, 50, or 100. Do NOT say the slip is filled or ask them to tap PLACE BET yet.`
          : "WORKFLOW — Phase 1: Ask which roster player they want to bet on.";
      case "awaiting_confirm":
        return `WORKFLOW — Phase 2 (preview): ${player || "Player"} + stake ${userLockedStake || "?"} are in the preview banner. Bet slip is still HIDDEN. Ask user to confirm — they can say "yes", "fill it", or "confirm and fill". Name + stake only; no odds recap. Do NOT say the slip is filled until System says "Bet slip filled".`;
      case "awaiting_place":
        return "WORKFLOW — Phase 3 (filled): Bet slip is OPEN on screen. Tell user to tap PLACE BET. Do not repeat odds.";
      case "awaiting_player":
        return "WORKFLOW: Stake is set — ask which roster player they want.";
      default:
        return slipCommitted
          ? "WORKFLOW — Phase 3: Bet slip open — user can tap PLACE BET."
          : "WORKFLOW: No active bet draft — help them pick a player or ask what they want.";
    }
  }

  function notifyYukiFlowStep({ respond = false } = {}) {
    const step = describeFlowStep();
    if (!step) return;
    if (respond) {
      sendBetFlowContext(step, { includeOddsInSummary: false, forceResponse: true });
    } else {
      sendBetFlowContextSilent(step, { includeOddsInSummary: false });
    }
  }
  function buildFlowExtras({ match, player, includeOddsInSummary } = {}) {
    const m = match ?? yukiPendingMatch;
    const p = player ?? yukiPendingPlayer;
    const showOdds = includeOddsInSummary ?? (m && p ? canVoiceOdds(m.id, p.id) : false);
    const pending = m && p
      ? buildBetSummary(m, p, userLockedStake, { includeOdds: showOdds })
      : null;
    if (showOdds && m && p) markOddsVoiced(m.id, p.id);

    const missing = getMissingBetFields();
    return [
      describeFlowStep(),
      pending ? `Current bet draft: ${pending}.` : "",
      missing.length ? `Still needed: ${missing.join(", ")}.` : "All required fields collected.",
      userLockedStake ? `Locked stake: ${userLockedStake} — shown in suggestion banner until slip is filled.` : "No stake set yet.",
      slipCommitted ? "Bet slip: OPEN on screen." : "Bet slip: HIDDEN — preview banner only until user confirms fill.",
      `Valid stakes: ${VALID_STAKES.join(", ")}.`,
      `Screen tab: ${getBoardState().active_tab_label}.`,
      noRepeatOddsHint(m?.id, p?.id),
    ].filter(Boolean).join(" ");
  }

  function sendBetFlowContextSilent(message, opts) {
    window.Voice?.sendContextSilent?.(`System: ${message} ${buildFlowExtras(opts)}`);
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

  function buildBetSummary(match, player, stake, { includeOdds } = {}) {
    const opponent = match.players.find(p => p.id !== player.id);
    const stakeVal = stake ?? userLockedStake;
    const showOdds = includeOdds ?? canVoiceOdds(match.id, player.id);
    const stakePart = stakeVal
      ? `${stakeVal} chips${showOdds ? ` (return ~${(stakeVal * player.odds).toFixed(2)})` : ""}`
      : "stake NOT SET — ask how much to wager (10, 25, 50, or 100)";
    const oddsPart = showOdds ? ` @ ${player.odds.toFixed(2)}` : "";
    return `${player.fullName} · ${match.tournament} ${match.round} vs ${opponent?.fullName || "opponent"}${oddsPart} · ${stakePart}`;
  }

  function getMissingBetFields() {
    const missing = [];
    const hasPlayer = !!(userChosenPlayerId || yukiPendingPlayer);
    if (!hasPlayer) missing.push("player");
    if (!userLockedStake) missing.push("stake");
    return missing;
  }

  function sendBetFlowContext(message, opts = {}) {
    const full = `System: ${message} ${buildFlowExtras(opts)}`;
    if (opts.forceResponse) {
      window.Voice?.sendContextAndRespond?.(full, { bypassGrace: true });
      return;
    }
    window.Voice?.sendContext?.(full);
  }

  function syncCapabilitiesIntro() {
    if (capabilitiesIntroSent) return;
    capabilitiesIntroSent = true;
    window.Voice?.sendContextSilent?.(
      "BETTING ASSISTANT RULES: Only suggest actions this app supports. Before offering any feature, verify it is in the SUPPORTED list. If the user asks for something unsupported, clearly state the limitation and offer a supported alternative — never present unavailable features as available. Keep replies relatively short and action-oriented; help navigate the screen and next steps. Only reference functionality that exists in this app. Do NOT recite this list at hello — greet briefly and ask the user's name if unknown.\n" +
      "SUPPORTED: World Cup 2026 Round of 16 TEAM match-winner betting; bracket filters (Full / West / East / Live); voice picks (best/underdog/favorite/switch); stakes 10/25/50/100; THREE-PHASE bet setup (suggest → stake → confirm → slip opens); tap PLACE BET or voice-delegated place after on-screen consent; scroll to roster team; mute/hide Yuki.\n" +
      "NOT SUPPORTED: parlays, cash out, custom stakes, nations off the R16 roster, general chat / companionship off betting, registration/accounts, voice bet placement WITHOUT consent modal, O/U or BTTS via voice (UI tabs only). You are a BET HELPER only — never invite casual conversation.\n" +
      "LOSSES: Respond empathetically and respectfully. Never laugh at, mock, or use sarcasm after a loss. Acknowledge briefly; focus on next available options (another team, stake, bracket side).\n" +
      "CAPABILITIES: Discuss visible R16 matches, recommend roster TEAMS using TEAM DOSSIERS (style, star players, edge/risk), prepare bet slips, set stake by voice, guide to PLACE BET. " +
      "You are a football betting ADVISER — helpful opinions based on team knowledge, NEVER certainty about who will win. " +
      "When they ask WHY you suggested a team (e.g. \"why France?\"), answer from dossiers: nickname, style, key stars and what they do, plus a clear edge — odds are secondary. " +
      "Trust CURRENT SCREEN system messages for what is visible NOW — when a bracket filter is active, ONLY discuss teams on that filter. " +
      "BET SETUP WORKFLOW (3 phases — follow exactly):\n" +
      "Phase 1 SUGGEST: You name a roster TEAM → app highlights them. Bet slip stays HIDDEN. Ask stake only (10, 25, 50, 100).\n" +
      "Phase 2 PREVIEW: User gives stake → preview banner shows name + stake. Slip still HIDDEN. Ask them to confirm (\"yes\", \"fill it\", or \"confirm and fill\").\n" +
      "Phase 3 FILL: Only after user confirms OR System says \"Bet slip filled\" → slip opens on screen. Tell them to tap PLACE BET.\n" +
      "Never say the slip is filled or open during Phase 1 or 2. Never ask for PLACE BET until Phase 3.\n" +
      "When the user names a team not on screen, the app may switch bracket filters and scroll — then continue Phase 1 → 2 → 3. " +
      "Football knowledge: UNDERDOG = higher decimal odds / lower FIFA seed. FAVORITE = lower odds. You may cite star players when explaining a TEAM pick, but bets are always on the TEAM. " +
      "Never assume team, stake, or outcome. Ask short follow-up questions for anything missing. " +
      "Before filling a slip, summarize team + stake once; state odds at most ONCE when first recommending. After the team is on screen, never repeat odds. Confirmations = team name + stake only. When the user confirms, the APP fills the slip — ONLY say it is filled after a System message containing 'Bet slip filled'. " +
      "Available stakes: 10, 25, 50, 100. " +
      "At session start: follow YukiIntro three-act script when active; otherwise ONE short bet-focused greeting — never invite off-topic chat."
    );
  }

  function clearSelection({ resetSuggestions = false } = {}) {
    selectedMatchId = selectedPlayerId = selectedStarId = null;
    yukiFlowState = "idle";
    yukiPendingMatch = yukiPendingPlayer = null;
    slipCommitted = false;
    clearUserChosenPlayer();
    clearUserLockedStake();
    clearOddsVoiced();
    removeSuggestionBanner();
    document.querySelectorAll(".player-odds-btn").forEach(b => b.classList.remove("selected", "yuki-suggested", "yuki-fill"));
    document.querySelectorAll(".star-chip").forEach(c => c.classList.remove("selected"));
    document.querySelectorAll(".match-card").forEach(c => c.classList.remove("has-selection", "has-yuki-preview"));
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
    if (!matchId || !playerId) return false;

    const match = MATCHES.find(m => m.id === matchId);
    const player = match?.players.find(p => p.id === playerId);
    if (!match || !player) return false;
    if (match.status === "final") {
      showFlashMsg("That match is already finished", "lose");
      return false;
    }

    const stake = resolveActiveStake();
    const balance = window.Betting?.getBalance?.() ?? 0;
    if (balance < stake) { showFlashMsg("Not enough balance!", "lose"); return false; }

    if (placeBtnEl) placeBtnEl.disabled = true;

    window.Betting?.adjustBalance(-stake);

    const opponent = match.players.find(p => p.id !== playerId);
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

    // Match winner drives the bracket. Winner market uses your bet; other markets sim the tie.
    let matchWinner;
    let matchLoser;
    if (activeBetType === "winner") {
      matchWinner = won ? player : opponent;
      matchLoser = won ? opponent : player;
    } else {
      const fav = getMatchFavorite(match) || player;
      matchWinner = Math.random() < 0.58 ? fav : (match.players.find(p => p.id !== fav.id) || opponent || player);
      matchLoser = match.players.find(p => p.id !== matchWinner.id) || opponent;
    }

    const sc = generateScore(matchWinner, matchLoser);
    const winnerIsP1 = match.players[0].id === matchWinner.id;
    match.score = winnerIsP1 ? `${sc.w}-${sc.l}` : `${sc.l}-${sc.w}`;
    match.status = "final";
    match.winnerId = matchWinner.id;
    match.loserId = matchLoser?.id || null;
    match.time = null;
    match.stats = null;

    if (won) {
      window.Betting?.adjustBalance(Math.round(stake * player.odds * 100) / 100);
      showFlashMsg(`+${net.toFixed(0)} ${player.flag} ${player.fullName} wins!`, "win");
      bus?.emit("sports:event", { type: "WIN", payload: { ...outcome, net } });
    } else {
      showFlashMsg(`−${stake} ${player.flag} ${player.fullName} lost`, "lose");
      bus?.emit("sports:event", { type: "LOSE", payload: { ...outcome, chip: stake } });
    }

    // Capture bracket source before DOM refresh so the flag can fly forward
    const srcFlag = document.querySelector(
      `#bracket-board .bt-flag[data-team="${matchWinner.id}"], #bracket-board .bt-flag.is-advanced[data-bt-team="${matchWinner.id}"]`
    ) || document.querySelector(`#card-${match.id} .player-odds-btn[data-player="${matchWinner.id}"] .player-flag`);
    const fromRect = srcFlag?.getBoundingClientRect?.() || null;

    const slotKey = advanceWinner(match, matchWinner);

    // Phone: open the Bracket section so the advance animation is visible
    if (isPhoneLayout() && activeView !== "bracket") {
      activeView = "bracket";
      applySportsView();
      renderViewTabs();
    }

    renderMatches();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => playBracketAdvance(fromRect, slotKey, matchWinner));
    });

    const progressed = matchWinner.fullName;
    setTimeout(() => {
      if (BRACKET.champion) {
        showFlashMsg(`${BRACKET.champion.flag} ${BRACKET.champion.fullName} are World Champions!`, "win");
        setTimeout(resetTournament, 3200);
      } else {
        showFlashMsg(`${progressed} advance · ${currentStageLabel()}`, "win");
      }
    }, 700);

    clearSelection({ resetSuggestions: true });
    yukiFlowState = "idle";
    selectedStarId = null;
    return true;
  }

  function canPlaceBet() {
    if (!selectedMatchId || !selectedPlayerId) return false;
    const stake = resolveActiveStake();
    const balance = window.Betting?.getBalance?.() ?? 0;
    return balance >= stake && stake > 0;
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
    clearAwaitingYukiPickSpeech();
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
    const stripped = (text || "").trim().toLowerCase().replace(/[!.,?]+$/, "");
    if (/^(ok|okay|yes|yep|yeah|sure|alright|cool|fine|good|great|perfect|absolutely|definitely|down|agreed|sounds good)$/.test(stripped)) {
      return true;
    }
    const t = text.toLowerCase();
    return /\b(yes|sure|ok|okay|go ahead|do it|confirm|fill|yep|yeah|sounds good|perfect|great|alright|cool|fine|good|absolutely|definitely|let's do it|lets do it)\b/.test(t)
      || /\blet'?s (do it|go|fill|place)\b/.test(t)
      || /\b(yes,? )?(fill|place) (it|the slip|bet)\b/.test(t);
  }

  function findYukiSwitchProposalPlayer() {
    return findYukiSuggestedPlayer(12) || findPlayerInRecentYukiSwitch(8);
  }

  function findPlayerInRecentYukiSwitch(limit = 8) {
    const turns = window.CharacterMemory?.getRecentTurns?.(limit) || [];
    for (let i = turns.length - 1; i >= 0; i--) {
      const turn = turns[i];
      if (turn.role !== "yuki") continue;
      if (!isYukiSwitchSpeech(turn.text)) continue;
      const found = fuzzyFindPlayer(turn.text, { suggestion: true });
      if (found) return { matchId: found.matchId, playerId: found.playerId };
      for (let j = i - 1; j >= 0 && j >= i - 2; j--) {
        if (turns[j].role !== "yuki") continue;
        const nearby = fuzzyFindPlayer(turns[j].text, { suggestion: true });
        if (nearby) return { matchId: nearby.matchId, playerId: nearby.playerId };
      }
    }
    return null;
  }

  function isYukiSuggestionSpeech(text) {
    if (!text) return false;
    if (isYukiSwitchSpeech(text) || isSwitchProposalText(text)) return true;
    const t = text.toLowerCase();
    return /\b(suggest|recommend|my pick|good pick|best pick|bet on|go with|how about|what about|try|would be|good bet|fancy|want to back|i'd go|i would go|let's go with|lets go with|i'd say|i'd pick|i'd take|i'd back|backing|take|look at)\b/.test(t)
      || /\b(should we|shall we|could we)\b.*\b(bet|pick|try|go)\b/.test(t)
      || /\b(why not|what if we|right now|for me|on screen)\b/.test(t)
      || /\b(best (player|pick|character|bet)|top pick|my money)\b/.test(t);
  }

  function findYukiSuggestedPlayer(limit = 12) {
    const turns = window.CharacterMemory?.getRecentTurns?.(limit) || [];
    for (let i = turns.length - 1; i >= 0; i--) {
      const turn = turns[i];
      if (turn.role !== "yuki") continue;
      if (!isYukiSuggestionSpeech(turn.text)) continue;
      const found = resolvePlayerFromYukiSpeech(turn.text);
      if (found) return found;
    }
    for (let i = turns.length - 1; i >= 0; i--) {
      const turn = turns[i];
      if (turn.role !== "yuki") continue;
      if (Date.now() - turn.at > 120000) break;
      const found = resolvePlayerFromYukiSpeech(turn.text);
      if (found) return found;
    }
    if (yukiPendingMatch && yukiPendingPlayer) {
      return { matchId: yukiPendingMatch.id, playerId: yukiPendingPlayer.id };
    }
    return null;
  }

  function applySuggestedPlayerUI(match, player, { suggested = true, scroll = true, accepted = false, stake = null } = {}) {
    if (!match || !player) return;

    const switchedTab =
      activeTournament !== "all" && activeTournament !== match.tournament;

    if (switchedTab) {
      selectTournament(match.tournament, { scroll: false });
      const tab = document.querySelector(`[data-tour="${match.tournament}"]`);
      tab?.classList.add("tour-tab-flash");
      setTimeout(() => tab?.classList.remove("tour-tab-flash"), 1400);
    }

    yukiPendingMatch = match;
    yukiPendingPlayer = player;
    slipCommitted = false;
    trackSuggestedPlayer(player.id, match.id);

    if (stake != null && isValidChipStake(stake)) {
      setUserLockedStake(stake);
    }

    showBetBanner(match, player, match.players.find(p => p.id !== player.id), { suggested: suggested && !accepted });
    selectOdds(match.id, player.id, { fromYuki: true, animate: true, openSlip: false });

    if (scroll) {
      scrollToMatchCard(match.id, player.id, {
        highlight: true,
        delay: switchedTab ? 320 : 80,
      });
    }

    yukiFlowState = userLockedStake ? "awaiting_confirm" : "awaiting_stake";
    markOddsVoiced(match.id, player.id);
    sendBetFlowContextSilent(
      `Showing ${player.fullName}${userLockedStake ? ` with ${userLockedStake} chips` : ""} in the preview banner — bet slip is HIDDEN. ` +
      (userLockedStake
        ? `Stake ${userLockedStake} is visible in the preview. Ask user to confirm with "yes" or "confirm and fill" — then the slip opens.`
        : "Ask stake (10, 25, 50, 100) or include it in your suggestion — it will show in the preview. Slip stays hidden until confirm."),
      { includeOddsInSummary: false }
    );
    syncBoardToVoice();
    if (userLockedStake) {
      notifyYukiFlowStep({ respond: true });
    }
  }

  function resolvePlayerFromYukiSpeech(text) {
    const clean = normalizeYukiSpeechText(text);
    // Cue wins always — "How about England. Brazil can be tough" must stay England.
    const fromCue = findPlayerAfterSuggestionCue(clean);
    if (fromCue) return fromCue;

    const mentions = findAllPlayerMentions(clean).filter((m) => !isNegatedMention(clean, m));
    if (mentions.length === 1) return mentions[0];
    // Multiple teams mentioned with no cue → do NOT guess (avoids wrong highlight).
    if (mentions.length > 1) return null;

    return null;
  }

  function absorbYukiSpeechSuggestion(text) {
    const clean = normalizeYukiSpeechText(text);
    if (!clean) return;

    const suggestedStake = parseYukiSuggestedStake(clean);
    const fromCue = findPlayerAfterSuggestionCue(clean);
    // While awaiting a pick, ONLY trust an explicit suggestion cue — never fuzzy leftovers.
    const found = fromCue
      || (isAwaitingYukiPickSpeech() ? null : resolvePlayerFromYukiSpeech(clean));
    const t = clean.toLowerCase();

    // Stake-only follow-up while a Yuki suggestion is on screen
    if (!found && yukiPendingMatch && yukiPendingPlayer && suggestedStake) {
      const inSuggestionFlow = isAwaitingYukiPickSpeech()
        || yukiFlowState === "awaiting_stake"
        || yukiFlowState === "awaiting_confirm"
        || isYukiSuggestionSpeech(clean);
      if (inSuggestionFlow) {
        applyStakeToSuggestionPreview(suggestedStake);
        if (isAwaitingYukiPickSpeech()) clearAwaitingYukiPickSpeech();
        return;
      }
    }

    if (!found) return;

    const awaitingPick = isAwaitingYukiPickSpeech();
    const cuedPick = Boolean(fromCue);
    const pickContext = cuedPick
      || awaitingPick
      || userAskedRecommendationRecently()
      || isYukiSuggestionSpeech(clean)
      || /\b(odds|value|underdog|favorite|favourite|back him|back her|my money|take|like|love|solid|strong|character|player|chips?|stake|wager)\b/.test(t);
    if (!pickContext) return;

    // If she already suggested a team via cue, only switch on a NEW cue (self-correct).
    if (
      !cuedPick
      && yukiPendingPlayer
      && yukiPendingMatch
      && (awaitingPick || yukiFlowState === "awaiting_stake" || yukiFlowState === "awaiting_confirm")
    ) {
      return;
    }

    const match = MATCHES.find(m => m.id === found.matchId);
    const player = match?.players.find(p => p.id === found.playerId);
    if (!match || !player) return;

    if (yukiPendingPlayer?.id === player.id && yukiPendingMatch?.id === match.id) {
      if (awaitingPick) clearAwaitingYukiPickSpeech();
      if (suggestedStake) {
        applyStakeToSuggestionPreview(suggestedStake, { match, player });
      }
      return;
    }

    clearAwaitingYukiPickSpeech();
    clearUserChosenPlayer();
    applySuggestedPlayerUI(match, player, { suggested: true, stake: suggestedStake });
  }

  function absorbYukiSwitchProposal(text) {
    absorbYukiSpeechSuggestion(text);
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
      const fromYukiSpeech = findYukiSuggestedPlayer();
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

  function isSlipConfirmPhrase(text) {
    const t = (text || "").toLowerCase();
    return /\b(confirm and fill|yes,? confirm|confirm.*fill|fill.*confirm|confirm it|fill it now)\b/.test(t)
      || (/\b(yes|yeah|yep|sure|ok|okay|go ahead|do it)\b/.test(t) && /\b(fill|confirm)\b/.test(t));
  }

  function isConfirmIntent(text) {
    if (isSwitchPlayerIntent(text)) return false;
    if (isFillSlipIntent(text) && fuzzyFindPlayer(text)) return false;

    const spoken = fuzzyFindPlayer(text);
    if (spoken && yukiPendingPlayer && spoken.playerId !== yukiPendingPlayer.id) return false;
    if (spoken && lockedFillTarget && spoken.playerId !== lockedFillTarget.playerId) return false;

    if (!slipCommitted && yukiPendingPlayer) {
      if (yukiFlowState === "awaiting_confirm" && userLockedStake) {
        return isSlipConfirmPhrase(text) || isFillSlipIntent(text) || isAffirmativeUtterance(text);
      }
      return isSlipConfirmPhrase(text) || isFillSlipIntent(text);
    }
    return isSlipConfirmPhrase(text) || isAffirmativeUtterance(text);
  }

  function beginPlayerSuggestion(match, player, { suggested = false, notifyVoice = false } = {}) {
    applySuggestedPlayerUI(match, player, { suggested });

    const switchedTab =
      activeTournament !== "all" && activeTournament !== match.tournament;

    if (notifyVoice || suggested || switchedTab) {
      window.Voice?.sendContextSilent?.(
        `System: Now showing ${player.fullName} — ${match.tournament} ${match.round}` +
        (switchedTab ? ` (switched to ${match.tournament} tab).` : " (scrolled to their match).") +
        " Player card is highlighted on screen."
      );
    }
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

  function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function findAllPlayerMentions(text) {
    const t = normalizeYukiSpeechText(text).toLowerCase();
    const hits = [];

    for (const m of MATCHES) {
      for (const p of m.players) {
        const full = p.fullName.toLowerCase();
        const fullIdx = t.indexOf(full);
        if (fullIdx >= 0) {
          hits.push({
            matchId: m.id,
            playerId: p.id,
            index: fullIdx,
            end: fullIdx + full.length,
            token: full,
          });
        }
        for (const alias of STT_PLAYER_ALIASES[p.id] || []) {
          if (!alias.includes(" ")) continue;
          const idx = t.indexOf(alias);
          if (idx >= 0) {
            hits.push({
              matchId: m.id,
              playerId: p.id,
              index: idx,
              end: idx + alias.length,
              token: alias,
            });
          }
        }
      }
    }

    const keys = Object.keys(NAME_MAP).sort((a, b) => b.length - a.length);
    for (const key of keys) {
      if (key.length < 3) continue;
      const re = new RegExp(`\\b${escapeRegex(key)}\\b`, "gi");
      let m;
      while ((m = re.exec(t))) {
        hits.push({
          ...NAME_MAP[key],
          index: m.index,
          end: m.index + m[0].length,
          token: key,
        });
      }
    }

    for (const m of MATCHES) {
      for (const p of m.players) {
        for (const alias of STT_PLAYER_ALIASES[p.id] || []) {
          if (alias.length < 3) continue;
          const re = new RegExp(`\\b${escapeRegex(alias)}\\b`, "gi");
          let match;
          while ((match = re.exec(t))) {
            hits.push({
              matchId: m.id,
              playerId: p.id,
              index: match.index,
              end: match.index + match[0].length,
              token: alias,
            });
          }
        }
      }
    }

    hits.sort((a, b) => a.index - b.index || b.token.length - a.token.length);

    const deduped = [];
    for (const hit of hits) {
      const overlaps = deduped.some(
        (d) => hit.index < d.end && hit.end > d.index
      );
      if (!overlaps) deduped.push(hit);
    }

    const lastByPlayer = new Map();
    for (const hit of deduped) {
      lastByPlayer.set(`${hit.matchId}:${hit.playerId}`, hit);
    }
    return [...lastByPlayer.values()].sort((a, b) => a.index - b.index);
  }

  function isNegatedMention(text, mention) {
    const before = (text || "").slice(Math.max(0, mention.index - 48), mention.index);
    return /\b(not|never|avoid|skip|instead of|rather than|no)\s+[\w.'-]+(?:\s+[\w.'-]+){0,4}\s*$/i.test(before);
  }

  function pickMentionAfterSuggestionCue(text, mentions) {
    const t = (text || "").toLowerCase();
    const cueRe = /\b(?:how about|what about|go with|let'?s go with|i'?d (?:go with|pick|take|back|say)|my pick(?: is| would be)?|recommend(?:ing)?|suggest(?:ing)?|try(?:ing)?|maybe)\b/gi;
    let cueEnd = -1;
    let m;
    while ((m = cueRe.exec(t))) {
      cueEnd = m.index + m[0].length;
      break;
    }
    if (cueEnd < 0) return null;
    const afterCue = mentions.filter((hit) => hit.index >= cueEnd - 2);
    return afterCue[0] || null;
  }

  function pickBestMention(text, mentions) {
    if (!mentions.length) return null;
    const affirmed = mentions.filter((hit) => !isNegatedMention(text, hit));
    const pool = affirmed.length ? affirmed : mentions;
    const fromCue = pickMentionAfterSuggestionCue(text, pool);
    if (fromCue) return fromCue;
    if (pool.length === 1) return pool[0];
    return pool[0];
  }

  const PICK_CUE_RE =
    /\b(?:how about|what about|go with|let'?s go with|suggest(?:ing)?|recommend(?:ing)?|pick(?:ing)?|bet on|try(?:ing)?|i'?d go with|i would go with|i'?d say|i'?d pick|i'?d take|i'?d back|my pick(?: is| would be)?|fancy|want to back|let'?s try|i mean|actually|no[, ]+(?:wait[, ]+)?|rather)\s+/gi;

  /** Pull only the team name right after a suggestion cue — never the rest of the sentence. */
  function extractCuedTeamPhrase(text, cueEndIndex) {
    const rest = (text || "").slice(cueEndIndex);
    // Stop at punctuation / conjunctions / comparison words so "England. Brazil…" stays England.
    const m = rest.match(
      /^\s*([a-z][a-z]*(?:\s+[a-z][a-z]*){0,3}?)(?=\s*(?:[.,!?;:—–-]|at\b|for\b|in\b|with\b|over\b|instead\b|vs\b|versus\b|they\b|who\b|because\b|since\b|and\b|but\b|or\b|$))/i
    );
    return m ? m[1].trim() : "";
  }

  function findPlayerInSegment(segment) {
    if (!segment || segment.length < 3) return null;

    // Prefer exact / alias hits inside this short phrase only.
    const mentions = findAllPlayerMentions(segment);
    if (mentions.length === 1) return mentions[0];
    if (mentions.length > 1) {
      // If the segment is just a team phrase, take the earliest (usually the only real pick).
      return mentions[0];
    }

    const compact = segment.replace(/\s+/g, "");
    let best = null;
    let bestDist = Infinity;
    MATCHES.forEach(m => {
      m.players.forEach(p => {
        const candidates = [p.id, p.name.toLowerCase(), p.fullName.toLowerCase().replace(/\s+/g, "")];
        for (const c of candidates) {
          if (c.length < 3) continue;
          const dist = levenshtein(compact, c);
          const maxDist = c.length >= 9 ? 2 : c.length >= 6 ? 1 : 0;
          if (dist <= maxDist && dist < bestDist) {
            bestDist = dist;
            best = { matchId: m.id, playerId: p.id };
          }
        }
      });
    });
    return best;
  }

  function findPlayerAfterSuggestionCue(text) {
    const t = (text || "").toLowerCase();
    PICK_CUE_RE.lastIndex = 0;
    let m;
    let lastFound = null;
    // Prefer the LAST cue so self-corrections ("Brazil… how about England") win.
    while ((m = PICK_CUE_RE.exec(t))) {
      const phrase = extractCuedTeamPhrase(t, m.index + m[0].length);
      if (!phrase) continue;
      const found = findPlayerInSegment(phrase);
      if (found) lastFound = found;
    }
    return lastFound;
  }

  function findSuggestedPlayer(text) {
    const fromCue = findPlayerAfterSuggestionCue(text);
    if (fromCue) return fromCue;

    const mentions = findAllPlayerMentions(text);
    if (!mentions.length) return fuzzyFindPlayerLoose(text);
    return pickBestMention(text, mentions);
  }

  function findPlayerByName(text) {
    const mentions = findAllPlayerMentions(text);
    if (!mentions.length) return null;

    const fromCue = findPlayerAfterSuggestionCue(text);
    if (fromCue) return fromCue;

    return pickBestMention(text, mentions);
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

  /** STT often mis-hears these roster names — map aliases to team ids. */
  const STT_PLAYER_ALIASES = (() => {
    const map = {};
    const overrides = {
      argentina: ["argentine", "messi's team", "albiceleste"],
      mexico: ["méxico", "el tri"],
      france: ["les bleus", "mbappe team", "mbappé's team"],
      senegal: ["lions of teranga"],
      brazil: ["brasil", "seleção", "selecao"],
      japan: ["samurai blue"],
      england: ["three lions", "englan"],
      switzerland: ["swiss"],
      spain: ["españa", "espana", "la roja"],
      germany: ["deutschland", "die mannschaft"],
      portugal: ["seleção das quinas", "ronaldo's team"],
      uruguay: ["la celeste", "charruas"],
      netherlands: ["holland", "oranje", "dutch"],
      usa: ["united states", "usmnt", "america", "u s a", "u.s.a", "us mnt"],
      morocco: ["atlas lions", "maroc"],
      croatia: ["vatreni", "modric team", "modrić team"],
    };
    MATCHES.forEach(m => {
      m.players.forEach(p => {
        const names = [p.id, p.name.toLowerCase(), p.fullName.toLowerCase()];
        (p.stars || []).forEach(star => {
          const label = starName(star).toLowerCase();
          if (!label) return;
          const parts = label.split(/\s+/);
          names.push(label);
          if (parts.length) names.push(parts[parts.length - 1]);
        });
        map[p.id] = [...new Set([...names, ...(overrides[p.id] || [])])];
      });
    });
    return map;
  })();

  function fuzzyFindPlayerLoose(text) {
    const t = (text || "").toLowerCase();
    const phraseCandidates = [];
    const forM = t.match(/\b(?:for|on|with|about)\s+([a-z][a-z\s.'-]{2,28})/);
    if (forM) phraseCandidates.push(forM[1].trim());
    phraseCandidates.push(t);

    for (const candidate of phraseCandidates) {
      if (!candidate || candidate.length < 3) continue;
      const found = findPlayerInSegment(candidate);
      if (found) return found;
    }
    return null;
  }

  function fuzzyFindPlayer(text, { suggestion = false } = {}) {
    if (suggestion) {
      const suggested = findSuggestedPlayer(text);
      if (suggested) return suggested;
    }

    const fromCue = findPlayerAfterSuggestionCue(text);
    if (fromCue) return fromCue;

    const exact = findPlayerByName(text);
    if (exact) return exact;

    return fuzzyFindPlayerLoose(text);
  }

  function findPlayerInRecentTurns({ roles = ["user", "yuki"], limit = 8 } = {}) {
    const turns = window.CharacterMemory?.getRecentTurns?.(limit) || [];
    for (let i = turns.length - 1; i >= 0; i--) {
      const turn = turns[i];
      if (!roles.includes(turn.role)) continue;
      const found = fuzzyFindPlayer(turn.text, { suggestion: true });
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
          stars: teamStars(p).map(s => s.name),
          knowledge: window.YukiTeamKnowledge?.getTeamKnowledge?.(p.id) || null,
        })),
      })),
      player_names: MATCHES.flatMap(m => m.players.map(p => p.fullName)),
      star_players: MATCHES.flatMap(m =>
        m.players.flatMap(p => teamStars(p).map(star => ({ team: p.fullName, name: star.name, perf: star.perf })))
      ),
      team_dossiers: MATCHES.flatMap(m =>
        m.players.map(p => ({
          team_id: p.id,
          full_name: p.fullName,
          ...(window.YukiTeamKnowledge?.getTeamKnowledge?.(p.id) || {}),
        }))
      ),
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
      "The player wants to bet. Ask what player or tournament they're interested in — short reply. Only explain your capabilities if they ask."
    );
    askRouter("place_bet", "The player wants to place a World Cup bet. Ask which Round of 16 team and stake they want — stay on betting only.");
    yukiFlowState = "idle";
  }

  function buildPickContext(player, match, opponent, { strategy = "best", includeOdds = true } = {}) {
    const isUnderdog = opponent && player.odds > opponent.odds;
    const isFavorite = opponent && player.odds < opponent.odds;
    let role = "pick";
    if (strategy === "underdog" || isUnderdog) {
      role = includeOdds
        ? `underdog @ ${player.odds.toFixed(2)}`
        : "underdog";
    } else if (strategy === "favorite" || isFavorite) {
      role = includeOdds ? `favorite @ ${player.odds.toFixed(2)}` : "favorite";
    }
    return `${player.fullName} (Rank #${player.rank}, ${role}) vs ${opponent?.fullName || "opponent"} in ${match.tournament} ${match.round}.`;
  }

  function handlePickIntent(text) {
    if (text && isTournamentNavIntent(text)) return;
    if (hasUserPlayerLock()) return;
    clearUserChosenPlayer();

    const strategy = classifyPickIntent(text);
    const rejected = getExcludedPlayerNames();

    if (strategy === "switch") {
      if (yukiPendingPlayer?.id) {
        trackSuggestedPlayer(yukiPendingPlayer.id, yukiPendingMatch?.id);
      } else if (lastSuggestedPlayerId) {
        trackSuggestedPlayer(lastSuggestedPlayerId, lastSuggestedMatchId);
      }
    }

    preparePickSuggestion(text);
    window.Voice?.cancelPendingResponse?.();
    sendVoicePickContext(text, { strategy });

    // Skip text-router when voice is live — it only adds latency and never drives the UI.
    if (!window.Voice?.isConnected?.()) {
      const prompt = strategy === "switch"
        ? "They want a different player — name one clearly on screen."
        : strategy === "underdog"
        ? "Who is the best underdog bet on screen right now? Name one player clearly."
        : strategy === "favorite"
        ? "Who is the strongest favorite on screen? Name one player clearly."
        : "Who is your best World Cup Round of 16 pick on screen right now? Name one TEAM clearly.";

      askRouter(
        strategy === "underdog" ? "underdog_pick" : strategy === "switch" ? "switch_player" : "best_pick",
        prompt,
        {
          pick_strategy: strategy,
          rejected_players: rejected,
          visible_player_names: getBoardState().visible_player_names,
        }
      );
    }
  }

  function handleBestPlayerIntent(text) {
    handlePickIntent(text);
  }

  function handleSwitchPlayerIntent(text) {
    handlePickIntent(text || "someone else");
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

    const wantsFill = isSlipConfirmPhrase(text) || (isExplicitFillOrConfirm(text) && isFillSlipIntent(text));
    if (wantsFill) {
      return handleConfirmIntent(text);
    }

    yukiFlowState = "awaiting_confirm";
    showBetBanner(match, player, opponent, { suggested: true });
    scrollToMatchCard(matchId, playerId, { highlight: false, delay: 80 });
    notifyYukiFlowStep({ respond: true });
    return true;
  }

  function isStakeIntent(text) {
    const stake = parseStakeFromSpeech(text);
    if (!stake) return false;
    if (fuzzyFindPlayer(text) && !/\b(on|for)\s+\d/.test(text)) return false;
    return true;
  }

  function isShowPlayerIntent(text) {
    const t = (text || "").toLowerCase();
    if (!fuzzyFindPlayer(text)) return false;
    return /\b(show|scroll|find|take me to|highlight|go to|open|display)\b/.test(t);
  }

  function handleShowPlayerIntent(text) {
    const found = fuzzyFindPlayer(text);
    if (!found) return false;

    const match = MATCHES.find(m => m.id === found.matchId);
    const player = match?.players.find(p => p.id === found.playerId);
    if (!match || !player) return false;

    markAwaitingYukiPickSpeech();
    applySuggestedPlayerUI(match, player, { suggested: !slipCommitted });
    sendBetFlowContextSilent(
      `Now showing ${player.fullName} on screen — scrolled and highlighted.`,
      { includeOddsInSummary: false }
    );
    return true;
  }

  /** Voice utterance names a roster player — pick or fill the slip for THAT player. */
  function handleVoicePlayerIntent(text) {
    const t = (text || "").toLowerCase();
    if (isTournamentNavIntent(t)) return false;

    if (isShowPlayerIntent(text)) {
      return handleShowPlayerIntent(text);
    }

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
        `User picked ${player.fullName} for ${userLockedStake} chips — preview on screen, slip HIDDEN. Ask them to confirm with "yes" or "confirm and fill".`,
        { includeOddsInSummary: false }
      );
      notifyYukiFlowStep({ respond: true });
    } else {
      sendBetFlowContext(
        `User picked ${player.fullName} — scrolled to their ${match.tournament} match. Phase 1: ask stake (10, 25, 50, 100). Slip stays hidden.`
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
      `Player chose ${player.fullName}. ${userLockedStake ? `Stake ${userLockedStake}. Ask to confirm — no odds recap.` : "Ask stake amount (10, 25, 50, 100), then confirm before filling — no odds recap."}`,
      { includeOddsInSummary: false }
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
    let target = resolveFillTarget(text);
    if (!target && (isSlipConfirmPhrase(text) || isAffirmativeUtterance(text))) {
      target = findYukiSuggestedPlayer();
    }
    if (!target) return false;

    const match = MATCHES.find(m => m.id === target.matchId);
    const player = match?.players.find(p => p.id === target.playerId);
    if (!match || !player) return false;

    const stake = resolveStakeForFill(text);
    if (!stake || !isValidChipStake(stake)) {
      selectOdds(target.matchId, target.playerId, { fromYuki: true, openSlip: false });
      yukiPendingMatch = match;
      yukiPendingPlayer = player;
      yukiFlowState = "awaiting_stake";
      showBetBanner(match, player, match.players.find(p => p.id !== player.id), { suggested: true });
      sendBetFlowContextSilent(
        `User wants to fill ${player.fullName} but stake is missing. Ask 10, 25, 50, or 100 — slip stays hidden until stake + confirm.`,
        { includeOddsInSummary: false }
      );
      return true;
    }

    setUserLockedStake(stake);
    removeSuggestionBanner();
    autofillBet(target.matchId, target.playerId, stake);
    yukiFlowState = "awaiting_place";
    yukiPendingMatch = yukiPendingPlayer = null;
    clearUserChosenPlayer();
    return true;
  }

  function autofillBet(matchId, playerId, amount) {
    cancelPendingFill();
    const gen = fillGeneration;

    const match = MATCHES.find(m => m.id === matchId);
    const player = match?.players.find(p => p.id === playerId);
    if (!match || !player) return;

    focusPlayerOnScreen(match, player, { highlight: true });

    // Update slip immediately so PLACE BET can't fire on a stale player during the animation delay
    selectOdds(matchId, playerId, { fromYuki: true, openSlip: true });
    setUserLockedStake(amount);
    selectedChip = amount;
    syncStakeUI();
    clearUserChosenPlayer();

    window.Voice?.sendContextAndRespond?.(
      `System: Bet slip filled — ${player.fullName}, ${amount} chips, ${match.tournament}. ` +
      `Tell user briefly to tap PLACE BET on screen. Do not repeat odds.`,
      { bypassGrace: true }
    );

    scheduleFill(() => {
      if (gen !== fillGeneration) return;
      scrollToMatchCard(matchId, playerId, { highlight: true, delay: 0 });
    }, 200);
  }

  // ── Bet confirmation banner ─────────────────────────────────────────────────
  function showBetBanner(match, player, opponent, { suggested = false } = {}) {
    clearSuggestionBannerUI();
    const slot = document.getElementById("yuki-confirm-slot");
    const card = document.getElementById(`card-${match.id}`);
    if (!slot || !card) return;

    const stake = userLockedStake ?? selectedChip;
    const canFill = !!(userLockedStake && VALID_STAKES.includes(userLockedStake));
    const potential = canFill ? (userLockedStake * player.odds).toFixed(2) : null;
    const label = suggested
      ? (canFill ? "Yuki’s pick — confirm?" : "Yuki’s pick")
      : "Confirm this bet?";

    yukiFlowState = canFill ? "awaiting_confirm" : "awaiting_stake";
    card.classList.add("has-yuki-suggest");

    slot.hidden = false;
    slot.innerHTML = `
      <div class="yuki-suggest-banner" id="yuki-suggest-banner">
        <div class="suggest-body">
          <span class="suggest-label">${label}</span>
          <div class="suggest-pick-line">
            <span class="suggest-team">${player.flag} <strong>${player.fullName}</strong></span>
            <span class="suggest-odds">${player.odds.toFixed(2)}</span>
          </div>
          <span class="suggest-vs">vs ${opponent?.flag || ""} ${opponent?.fullName || ""} · ${match.bracketLabel || match.round}</span>
          ${canFill
            ? `<span class="suggest-stake">Stake <strong>${userLockedStake}</strong> → return <strong>${potential}</strong></span>`
            : `<span class="suggest-stake missing">Choose a stake: 10 · 25 · 50 · 100</span>`}
        </div>
        <div class="suggest-actions">
          <button class="suggest-confirm" id="suggest-yes-btn" ${canFill ? "" : "disabled"}>
            ${canFill ? "Confirm" : "Set stake"}
          </button>
          <button class="suggest-dismiss" id="suggest-no-btn" aria-label="Dismiss">✕</button>
        </div>
      </div>`;

    document.getElementById("suggest-yes-btn")?.addEventListener("click", () => {
      if (canFill) handleConfirmIntent();
    });
    document.getElementById("suggest-no-btn")?.addEventListener("click", () => {
      removeSuggestionBanner();
      slipCommitted = false;
      yukiFlowState = "idle";
      yukiPendingMatch = yukiPendingPlayer = null;
      clearUserLockedStake();
      closeBetSlip();
      document.querySelectorAll(".player-odds-btn.yuki-suggested").forEach(b => b.classList.remove("yuki-suggested"));
      document.querySelectorAll(".match-card.has-yuki-preview").forEach(c => c.classList.remove("has-yuki-preview"));
      updateBestBadgesVisibility();
    });
  }

  function clearSuggestionBannerUI() {
    const slot = document.getElementById("yuki-confirm-slot");
    if (slot) {
      slot.hidden = true;
      slot.innerHTML = "";
    }
    document.getElementById("yuki-suggest-banner")?.remove();
    document.querySelectorAll(".match-card.has-yuki-suggest").forEach(c => c.classList.remove("has-yuki-suggest"));
  }

  function removeSuggestionBanner() {
    clearSuggestionBannerUI();
    document.querySelectorAll(".player-odds-btn.yuki-suggested").forEach(b => b.classList.remove("yuki-suggested"));
    document.querySelectorAll(".match-card.has-yuki-preview").forEach(c => c.classList.remove("has-yuki-preview"));
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

  bus?.on("betting:ready", startOddsTicker);

  bus?.on("voice:ready", () => {
    syncCapabilitiesIntro();
    syncBoardToVoice();
    window.Voice?.syncUserNameToVoice?.();
  });

  bus?.on("voice:transcript", ({ text, role, partial }) => {
    if (partial || !text || role === "yuki") return;
    if (isConfirmIntent(text)) {
      handleConfirmIntent(text);
      return;
    }
    const found = fuzzyFindPlayer(text);
    if (found) setUserChosenPlayer(found.matchId, found.playerId);
    const stake = parseStakeFromSpeech(text);
    if (stake) setUserLockedStake(stake);
  });

  if (window.Betting) startOddsTicker();

  window.Sports = {
    handleBetIntent,
    handleBestPlayerIntent,
    normalizeYukiSpeechText,
    absorbYukiSpeechSuggestion,
    handlePickIntent,
    preparePickSuggestion,
    prepareEarlyPickRequest,
    shouldRepromptPickSpeech,
    isAwaitingYukiPickSpeech,
    handleShowPlayerIntent,
    isShowPlayerIntent,
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
    placeBet,
    canPlaceBet,
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
    isVoicePickRequest,
    isPickStrategyIntent,
    classifyPickIntent,
    isConfirmIntent,
    isSlipConfirmPhrase,
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
