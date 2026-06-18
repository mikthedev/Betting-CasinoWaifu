/**
 * voiceBetting.js — voice-delegated tennis bet placement (with consent modal)
 */
(function () {
  const bus = window.EventBus;

  let delegateConsent = false;
  let consentModal = null;
  let pendingConsentResolve = null;

  const DELEGATE_CONSENT_HINT =
    "Player consented to voice-delegated bet placement until page refresh. " +
    "Distinguish QUESTIONS from COMMANDS. Questions (\"can you place the bet?\") — answer only, do NOT submit. " +
    "Clear commands (\"place the bet for me\", \"submit it\") — tap PLACE BET on screen via voice action. " +
    "If UNSURE — ask one short confirmation (\"Want me to place it now?\"). " +
    "Slip must have player + stake before placing. Chip/stake select by voice is OK without extra consent.";

  function isQuestion(text) {
    const t = (text || "").trim();
    return t.endsWith("?") || /\b(can you|could you|should i|what if|how do|would you|will you)\b/i.test(t);
  }

  function detectConsentTrigger(text) {
    if (!text || isQuestion(text)) return false;
    const t = text.toLowerCase();

    if (/\b(place (the |my |a )?bet for me|bet for me|place bets for me|you place (the |my )?bet|you bet for me|submit (the |my )?bet for me|place it for me|wager for me)\b/.test(t)) {
      return true;
    }
    if (/\b(want you to place|need you to place|have you place|let you place|on my behalf|you handle (the |my )?bet|take over (and )?bet|do the bet for me)\b/.test(t)) {
      return true;
    }
    if (/\b(go ahead and (place|submit)|please place (the |my )?bet|i want you to (place|submit))\b/.test(t)) {
      return true;
    }
    if (/\b(can you place|could you place|will you place)\b/.test(t) && /\b(bet|slip|wager)\b/.test(t)) {
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
        hint: "Bet slip is not ready — pick a player and stake (10, 25, 50, 100) before placing.",
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
        hint: "Player wants voice-delegated bet placement. Tell them to review the on-screen consent prompt and tap Consent or Deny.",
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
          <p>You asked Yuki to place tennis bets on your behalf via voice.</p>
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
