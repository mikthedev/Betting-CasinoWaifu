/**
 * voiceBetting.js — voice-delegated World Cup bet placement (with consent modal)
 */
(function () {
  const bus = window.EventBus;

  let delegateConsent = false;
  let consentModal = null;
  let pendingConsentResolve = null;

  const DELEGATE_CONSENT_HINT =
    "Player consented to voice-delegated bet placement until page refresh. " +
    "Only place bets when they give clear commands (\"place the bet for me\", \"submit it\", \"go ahead\"). " +
    "Questions about betting, odds, or rules — answer only, never submit. " +
    "Never mention consent unless they asked you to place bets for them.";

  function isQuestion(text) {
    const t = (text || "").trim();
    return t.endsWith("?") || /\b(can you|could you|should i|what if|how do|would you|will you)\b/i.test(t);
  }

  function isEducationalOrRulesQuestion(text) {
    const t = (text || "").toLowerCase().trim();
    if (!t) return false;
    if (
      /\b(explain|tell me about|walk me through|teach me|help me understand|describe|break down)\b/.test(t) &&
      /\b(bet|betting|odds|slip|stake|football|soccer|world cup|parlay|handicap|market|works?)\b/.test(t)
    ) {
      return true;
    }
    return (
      /\b(how does|how do|how is|how are|how would|how should|how to)\b[\s\S]{0,70}\b(work|works|bet|betting|slip|odds|stake|football|soccer|world cup)\b/.test(t) ||
      /\b(what is|what are|what'?s)\b[\s\S]{0,50}\b(bet slip|odds|parlay|handicap|market|staking)\b/.test(t) ||
      /\b(what are the rules|how to bet|how do i bet|never played|first time|new to|don'?t know how)\b/.test(t) ||
      /\b(can you|could you|will you)\s+(explain|tell me|describe|walk me through|teach)\b/.test(t)
    );
  }

  function isAdviceQuestion(text) {
    const t = (text || "").toLowerCase().trim();
    if (!isQuestion(text)) return false;
    return (
      /\b(should i|what should|which team|which player|who should|best bet|good bet|worth it|recommend|suggest|pick for me|your pick|your opinion|what do you think)\b/.test(t) ||
      /\b(underdog|favorite|favourite|safer|riskier)\b/.test(t)
    );
  }

  function isReflectiveSpeech(text) {
    const t = (text || "").toLowerCase();
    return /\b(thinking|not sure|hmm+|debating|torn|between|leaning|maybe|wondering|what about|or should)\b/.test(t);
  }

  function isDelegationQuestion(text) {
    const t = (text || "").toLowerCase().trim();
    if (isEducationalOrRulesQuestion(text)) return false;
    return (
      /\b(can you|could you|will you|would you|are you able|want you to|need you to)\b[\s\S]{0,50}\b(place|submit|bet|wager)\b/.test(t) ||
      /\b(place|submit|bet|wager)[\s\S]{0,40}\b(for me|on my behalf|my behalf)\b/.test(t)
    );
  }

  function detectImplicitActionRequest(text) {
    const t = (text || "").toLowerCase().trim();
    if (isAdviceQuestion(text) || isReflectiveSpeech(text) || isEducationalOrRulesQuestion(text)) return false;

    const patterns = [
      /\b(place|put|submit|lock in|go with)\s+(?:my\s+|the\s+|a\s+)?\b(bet|slip|wager)\b/,
      /\b(bet|wager)\s+(?:for me|on my behalf)\b/,
      /\b(you|yuki)\s+(?:place|submit|bet|wager)\b/,
      /\b(go ahead|do it|just do|right now|make it happen)\b.*\b(bet|slip|wager|place)\b/,
    ];
    return patterns.some((re) => re.test(t));
  }

  function isClearCommand(text) {
    const t = (text || "").toLowerCase().trim();
    if (isQuestion(text) && !/\b(yes|go ahead|do it|place it|submit)\b/.test(t)) return false;
    if (/\b(for me|go ahead|do it|just do|right now|on my behalf|want you to|need you to)\b/.test(t)) {
      return /\b(bet|slip|wager|place|submit)\b/.test(t);
    }
    if (/\b(place|submit|lock in|finali[sz]e)\b/.test(t) && /\b(bet|slip|wager)\b/.test(t)) return true;
    return detectPlaceBetCommand(text);
  }

  function isSlipFillOrConfirmRequest(text) {
    if (!text) return false;
    if (window.Sports?.isSlipConfirmPhrase?.(text)) return true;
    if (window.Sports?.isFillSlipIntent?.(text)) return true;
    if (window.Sports?.isConfirmIntent?.(text)) return true;
    const t = text.toLowerCase();
    return /\b(fill|confirm).*(slip|form)\b/.test(t)
      || /\b(fill it|confirm it|confirm and fill)\b/.test(t);
  }

  function detectConsentTrigger(text) {
    if (!text) return false;
    if (isSlipFillOrConfirmRequest(text)) return false;
    if (isAdviceQuestion(text) || isReflectiveSpeech(text) || isEducationalOrRulesQuestion(text)) {
      return false;
    }

    if (isDelegationQuestion(text)) return true;

    const t = text.toLowerCase();
    const explicitDelegate =
      /\b(bet for me|place (a |the |my )?bet( for me| on)?|you bet|you place|submit (the |my )?bet for me|place bets for me|you handle|you do it|want you to (place|submit|bet)|go ahead and (place|submit|bet)|please (place|submit) (the |my )?bet|i want you to (place|submit|bet)|have you (place|submit|bet)|let you (place|submit|bet|handle)|need you to (place|submit|bet)|on my behalf|take over|do the bet for me|wager for me)\b/.test(
        t
      );
    if (explicitDelegate) return true;

    if (detectImplicitActionRequest(text)) return true;

    if (isClearCommand(text) && /\b(for me|on my behalf|you place|you bet|want you to)\b/.test(t)) {
      return true;
    }

    return false;
  }

  function detectPlaceBetCommand(text) {
    if (!text) return false;
    const t = text.toLowerCase();
    if (isQuestion(text) && !/\b(yes|go ahead|do it|place it|submit)\b/.test(t)) return false;

    return /\b(place (the |my )?bet|submit (the |my )?bet|place it|submit it|lock it in|confirm (the )?bet|finali[sz]e (the )?bet)\b/.test(t)
      || /\b(go ahead|do it|yes,? place)\b/.test(t) && /\b(bet|slip)\b/.test(t);
  }

  function canPlaceBet() {
    return !!window.Sports?.canPlaceBet?.();
  }

  function executePlaceBet() {
    if (!hasConsent()) return { ok: false, reason: "no-consent" };
    if (!canPlaceBet()) {
      return {
        ok: false,
        reason: "slip-incomplete",
        hint: "Bet slip is not ready — pick a team and stake (10, 25, 50, 100) before placing.",
      };
    }
    const placed = window.Sports?.placeBet?.();
    if (!placed) {
      return { ok: false, reason: "place-failed", hint: "Could not place bet — check balance and bet slip." };
    }
    bus?.emit("sports:voice-placed", {});
    return { ok: true, hint: "Bet placed on screen. React to the outcome briefly." };
  }

  function handleUserSpeech(text) {
    const wantsDelegate = detectConsentTrigger(text);
    const wantsPlace = detectPlaceBetCommand(text);

    if (wantsDelegate && !hasConsent()) {
      return {
        executed: false,
        needsConsent: true,
        hint: "Player explicitly asked you to place bets for them. Tell them briefly to tap Consent on the on-screen prompt — nothing else.",
      };
    }

    if (!wantsPlace) return { executed: false };

    if (!hasConsent()) {
      if (wantsDelegate) {
        return {
          executed: false,
          needsConsent: true,
          hint: "Player wants you to place bets by voice. Show consent prompt first.",
        };
      }
      return {
        executed: false,
        hint: "Player asked to place a bet by voice but has not consented to voice-delegated placement. Tell them to tap PLACE BET manually or consent first.",
      };
    }

    const result = executePlaceBet();
    return {
      executed: !!result.ok,
      result,
      hint: result.hint,
    };
  }

  function handleYukiSpeech(text) {
    if (!hasConsent() || !text) return { executed: false };
    if (isQuestion(text)) return { executed: false };

    const t = text.toLowerCase();
    const yukiPlacing =
      /\b(placing|submitting|locking in|here we go|placing your bet|bet is in|going with)\b/.test(t)
      && /\b(bet|slip|wager)\b/.test(t);

    if (!yukiPlacing && !detectPlaceBetCommand(text)) return { executed: false };

    const result = executePlaceBet();
    return { executed: !!result.ok, result, hint: result.hint };
  }

  function buildConsentModal() {
    if (consentModal) return consentModal;
    const el = document.createElement("div");
    el.id = "yuki-delegate-consent";
    el.hidden = true;
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-labelledby", "yuki-consent-title");
    el.innerHTML = `
      <div class="yuki-consent-card">
        <h2 class="yuki-consent-title" id="yuki-consent-title">Voice-Delegated Betting</h2>
        <div class="yuki-consent-body">
          <p>You asked Yuki to place World Cup bets on your behalf via voice.</p>
          <p>By continuing, you authorize Yuki to submit bets on the bet slip when you verbally request it. You remain responsible for your balance and betting decisions.</p>
          <p>This is a demo prototype with no real money. Betting CasinoWaifu accepts no liability for losses, timing errors, or unintended actions after consent. Authorization lasts until you refresh or close this page.</p>
        </div>
        <div class="yuki-consent-actions">
          <button type="button" class="yuki-consent-btn deny" id="yuki-consent-deny">Deny</button>
          <button type="button" class="yuki-consent-btn consent" id="yuki-consent-accept">Consent</button>
        </div>
      </div>
    `;
    document.body.appendChild(el);

    el.querySelector("#yuki-consent-deny").addEventListener("click", () => resolveConsent(false));
    el.querySelector("#yuki-consent-accept").addEventListener("click", () => resolveConsent(true));
    el.addEventListener("click", (e) => {
      if (e.target === el) resolveConsent(false);
    });

    consentModal = el;
    return el;
  }

  function resolveConsent(granted) {
    if (consentModal) consentModal.hidden = true;
    delegateConsent = !!granted;
    if (granted) {
      bus?.emit("sports:delegate-consent", { granted: true });
      window.Voice?.notifyDelegateConsent?.(true);
    } else {
      bus?.emit("sports:delegate-consent", { granted: false });
      window.Voice?.notifyDelegateConsent?.(false);
    }
    if (pendingConsentResolve) {
      pendingConsentResolve(granted);
      pendingConsentResolve = null;
    }
  }

  function requestDelegateConsent() {
    if (delegateConsent) return Promise.resolve(true);
    buildConsentModal();
    return new Promise((resolve) => {
      pendingConsentResolve = resolve;
      consentModal.hidden = false;
    });
  }

  function hasConsent() {
    return delegateConsent;
  }

  function revokeConsent() {
    delegateConsent = false;
  }

  window.VoiceBetting = {
    DELEGATE_CONSENT_HINT,
    detectConsentTrigger,
    detectPlaceBetCommand,
    handleUserSpeech,
    handleYukiSpeech,
    requestDelegateConsent,
    hasConsent,
    revokeConsent,
    executePlaceBet,
  };
})();
