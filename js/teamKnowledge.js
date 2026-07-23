/**
 * teamKnowledge.js — qualitative World Cup R16 dossiers for Yuki
 * Used when she recommends a team or answers "why that pick?"
 */
(function () {
  /** @type {Record<string, { nickname: string, style: string, strengths: string, edge: string, risk: string, starsWhy: string }>} */
  const TEAM_KNOWLEDGE = {
    argentina: {
      nickname: "La Albiceleste",
      style: "Patient build-up, late creativity, ruthless in transitions",
      strengths: "Tournament winners' mentality, Messi's big-game brain, compact midfield",
      edge: "They grind ugly knockout games and still find a moment of magic",
      risk: "Ageing spine — if the press is broken early they can look leggy",
      starsWhy:
        "Lionel Messi still dictates tempo and late chances; Julián Álvarez presses and finishes transitions; Enzo Fernández wins the middle",
    },
    mexico: {
      nickname: "El Tri",
      style: "Athletic mid-block, wide counters, set-piece danger",
      strengths: "Home-crowd energy in North America, physical midfield, Lozano's pace",
      edge: "They punch above ranking when the game stays chaotic and open",
      risk: "Struggle to break deep elite blocks for 90 minutes",
      starsWhy:
        "Hirving Lozano stretches defenses; Santiago Giménez is a pure finisher; Edson Álvarez anchors the middle",
    },
    france: {
      nickname: "Les Bleus",
      style: "Vertical, athleticism-first, devastating on the break",
      strengths: "World-class depth, Mbappé's elite pace, strong defensive midfield",
      edge: "Even when not fluent, individual quality wins knockout ties",
      risk: "Can look disconnected if the midfield doesn't connect to the front three",
      starsWhy:
        "Kylian Mbappé is a match-winner in open space; Ousmane Dembélé creates chaos wide; Aurélien Tchouaméni screens and recovers",
    },
    senegal: {
      nickname: "The Lions of Teranga",
      style: "Physical, direct, compact defensive shape with explosive counters",
      strengths: "Aerial power, Mané's big-game instinct, Koulibaly's leadership",
      edge: "They thrive in high-intensity duels and punish slow build-ups",
      risk: "Chance creation can dry up against ultra-deep blocks",
      starsWhy:
        "Sadio Mané still finds decisive moments; Ismaïla Sarr stretches lines; Kalidou Koulibaly organizes the back line",
    },
    brazil: {
      nickname: "A Seleção",
      style: "Fluid attack, 1v1 magic wide, high pressing when locked in",
      strengths: "Individual brilliance, Vinícius's carry threat, young firepower",
      edge: "One player can invent a goal from nothing — lethal in open knockout games",
      risk: "Defensive concentration lapses if they overcommit forward",
      starsWhy:
        "Vinícius Júnior beats markers in transition; Rodrygo finishes and links; Endrick is a chaos goal threat",
    },
    japan: {
      nickname: "Samurai Blue",
      style: "High work-rate, disciplined shape, quick combinations",
      strengths: "Organization, Mitoma/Kubo creativity, Endo's midfield control",
      edge: "They upset favorites by staying compact then striking on the break",
      risk: "Can be overpowered if forced into pure aerial / physical duels",
      starsWhy:
        "Takefusa Kubo creates between lines; Kaoru Mitoma beats full-backs; Wataru Endo shields and recycles",
    },
    england: {
      nickname: "The Three Lions",
      style: "Structured possession, strong wide outlets, set-piece threat",
      strengths: "Kane's finishing, Bellingham's box runs, Saka's 1v1 quality",
      edge: "Deep talent pool — they can change a game from the bench",
      risk: "Can look cautious and low-tempo when protecting a lead",
      starsWhy:
        "Harry Kane finishes half-chances; Jude Bellingham arrives late in the box; Bukayo Saka creates from the right",
    },
    switzerland: {
      nickname: "The Nati",
      style: "Compact mid-block, smart counters, midfield steel",
      strengths: "Xhaka's control, tournament discipline, Embolo's physical presence",
      edge: "Hard to break down — they steal points with organization",
      risk: "Limited star ceiling if they need to chase a game late",
      starsWhy:
        "Granit Xhaka sets tempo; Xherdan Shaqiri still finds the pass; Breel Embolo unsettles centre-backs",
    },
    spain: {
      nickname: "La Roja",
      style: "Positional play, high press, technical midfield dominance",
      strengths: "Pedri/Yamal creativity, control of the ball, youth energy",
      edge: "They suffocate opponents with possession and late cut-backs",
      risk: "Can over-pass in the final third without enough shot volume",
      starsWhy:
        "Lamine Yamal is a pure creator on the wing; Pedri connects phases; Fabián Ruiz progresses under pressure",
    },
    germany: {
      nickname: "Die Mannschaft",
      style: "Aggressive press, inverted attackers, high tempo",
      strengths: "Musiala/Wirtz creativity, athletic midfield, Havertz versatility",
      edge: "They overwhelm mid-table sides with waves of pressure",
      risk: "Vulnerable in transition if the press is bypassed cleanly",
      starsWhy:
        "Jamal Musiala dribbles through lines; Florian Wirtz creates chances; Kai Havertz links and finishes",
    },
    portugal: {
      nickname: "A Seleção das Quinas",
      style: "Wide creativity, set pieces, late Ronaldo box presence",
      strengths: "Bruno's vision, Leão's pace, tournament experience",
      edge: "They always have a plan-B goal threat from dead balls or Ronaldo",
      risk: "Can become too reliant on moments instead of sustained control",
      starsWhy:
        "Cristiano Ronaldo remains a box magnet; Bruno Fernandes creates and shoots; Rafael Leão stretches defenses",
    },
    uruguay: {
      nickname: "La Celeste",
      style: "Fighting mid-block, vertical counters, defensive toughness",
      strengths: "Valverde's engine, Núñez's chaos runs, Araújo's defending",
      edge: "They win ugly knockout games with grit and set pieces",
      risk: "Can leave gaps if Núñez's press isn't coordinated",
      starsWhy:
        "Federico Valverde covers huge ground; Darwin Núñez forces errors; Ronald Araújo wins duels",
    },
    netherlands: {
      nickname: "Oranje",
      style: "Build from the back, wing-backs, structured attacking patterns",
      strengths: "Van Dijk leadership, Gakpo's carry, Simons' creativity",
      edge: "Balanced side — solid enough to grind, talented enough to unlock",
      risk: "Can look predictable if opponents pack the half-spaces",
      starsWhy:
        "Virgil van Dijk organizes everything; Cody Gakpo carries into the box; Xavi Simons invents the final pass",
    },
    usa: {
      nickname: "The USMNT",
      style: "Athletic press, vertical transitions, home-tournament boost",
      strengths: "Pulisic creativity, midfield energy, crowd lift in North America",
      edge: "Home soil + athleticism makes them dangerous underdogs / coin-flip sides",
      risk: "Final-third composure can wobble against elite defensive blocks",
      starsWhy:
        "Christian Pulisic creates and finishes; Weston McKennie wins second balls; Timothy Weah stretches wide",
    },
    morocco: {
      nickname: "The Atlas Lions",
      style: "Ultra-compact block, lightning counters, Hakimi overlaps",
      strengths: "Defensive organization, tournament experience, En-Nesyri aerial threat",
      edge: "They upset giants by staying compact then striking once",
      risk: "Low possession games require clinical finishing on few chances",
      starsWhy:
        "Achraf Hakimi bombs forward; Youssef En-Nesyri wins boxes; Sofyan Amrabat shields the back four",
    },
    croatia: {
      nickname: "The Vatreni",
      style: "Midfield control, slow tempo, late-game experience",
      strengths: "Modrić's intelligence, tournament know-how, composure under pressure",
      edge: "They out-think opponents in knockout chess matches",
      risk: "Aging legs — can be overrun by younger athletic fronts",
      starsWhy:
        "Luka Modrić still runs the tempo; Marcelo Brozović recycles possession; Andrej Kramarić finishes chances",
    },
  };

  function getTeamKnowledge(teamId) {
    if (!teamId) return null;
    return TEAM_KNOWLEDGE[String(teamId).toLowerCase()] || null;
  }

  function formatTeamDossier(team) {
    const k = getTeamKnowledge(team?.id);
    if (!k || !team) return null;
    const stars = (team.stars || [])
      .map((s) => (typeof s === "string" ? s : s?.name))
      .filter(Boolean)
      .join(", ");
    return (
      `${team.fullName || team.name} (${k.nickname}): style — ${k.style}. ` +
      `Strengths — ${k.strengths}. Edge — ${k.edge}. Risk — ${k.risk}. ` +
      `Why the stars matter — ${k.starsWhy}` +
      (stars ? ` (stars: ${stars})` : "")
    );
  }

  function buildTeamKnowledgeBook(teams) {
    const list = Array.isArray(teams) ? teams : [];
    const lines = list
      .map((t) => formatTeamDossier(t))
      .filter(Boolean);
    if (!lines.length) return "";
    return (
      "TEAM DOSSIERS (authoritative qualitative knowledge — use these when recommending or when the user asks WHY a pick): " +
      lines.join(" || ")
    );
  }

  window.YukiTeamKnowledge = {
    TEAM_KNOWLEDGE,
    getTeamKnowledge,
    formatTeamDossier,
    buildTeamKnowledgeBook,
  };
})();
