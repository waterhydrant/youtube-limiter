const MESSAGE_TYPES = {
  youtubePageLoaded: "YOUTUBE_PAGE_LOADED",
  youtubePageAccessed: "YOUTUBE_PAGE_ACCESSED",
};

const BLOCKER_MESSAGE_TYPES = {
  blockerLock: "YT_BLOCKER_LOCK",
  blockerUnlock: "YT_BLOCKER_UNLOCK",
};


const STORAGE_KEYS = {
  lastDate: "lastDate",
  blockAllYoutube: "blockAllYoutube",
  longestStreak: "longestStreak",
  affirmation: "affirmation",
  affirmationMode: "affirmationMode",
};


const DEFAULT_AFFIRMATION =
  "I affirm that watching YouTube is the best use of my limited energy right now. I am choosing it intentionally, not because I am avoiding real rest, work, movement, or something more restorative.";

const affirmationGenerator = (() => {
  const openings = [
    "I affirm that",
    "I acknowledge that",
    "I recognize that",
    "I understand that",
    "I am choosing with awareness that"
  ];

  const youtubeChoices = [
    "watching YouTube",
    "spending time on YouTube",
    "opening YouTube right now",
    "using YouTube at this moment",
    "continuing onto YouTube"
  ];

  const valueStatements = [
    "is the best use of my limited energy right now",
    "is genuinely how I want to spend my limited energy right now",
    "is more worthwhile right now than the alternatives available to me",
    "is an intentional use of my attention and energy at this moment",
    "is the choice that best serves me right now",
    "is worth the time and energy I am about to give it"
  ];

  const intentionalOpenings = [
    "I am making this choice intentionally",
    "I am choosing this deliberately",
    "This is a conscious choice",
    "I am proceeding on purpose",
    "I am deciding this with intention"
  ];

  const avoidanceStatements = [
    "not because I am avoiding real rest, meaningful work, movement, or something more restorative",
    "not as a way to avoid rest, work, movement, or an activity that would actually restore me",
    "not because it is easier than resting properly, doing meaningful work, moving, or doing something more renewing",
    "not because I am escaping from work, genuine rest, movement, or something better for my energy",
    "not as an automatic substitute for rest, progress, movement, or something truly restorative",
    "not because I am defaulting to stimulation instead of rest, work, movement, or real recovery"
  ];

  const closings = [
    "",
    " I accept that choice.",
    " I am making that decision honestly.",
    " I am choosing it with full awareness.",
    " I accept the tradeoff I am making."
  ];

  // Prevents the last several affirmations from immediately repeating.
  const recentAffirmations = [];
  const MAX_RECENT = 25;

  function randomItem(array) {
    const randomValue = crypto.getRandomValues(new Uint32Array(1))[0];
    return array[randomValue % array.length];
  }

  function generate() {
    let affirmation;
    let attempts = 0;

    do {
      const firstSentence =
        `${randomItem(openings)} ${randomItem(youtubeChoices)} ` +
        `${randomItem(valueStatements)}.`;

      const secondSentence =
        `${randomItem(intentionalOpenings)}, ` +
        `${randomItem(avoidanceStatements)}.`;

      affirmation = firstSentence + " " + secondSentence + randomItem(closings);
      attempts++;
    } while (recentAffirmations.includes(affirmation) && attempts < 100);

    recentAffirmations.push(affirmation);

    if (recentAffirmations.length > MAX_RECENT) {
      recentAffirmations.shift();
    }

    return affirmation;
  }

  return { generate };
})();

async function getRequiredAffirmation() {
  const data = await chrome.storage.local.get([
    STORAGE_KEYS.affirmation,
    STORAGE_KEYS.affirmationMode,
  ]);

  if (data.affirmationMode === "generated") {
    return affirmationGenerator.generate();
  }

  return data.affirmation || DEFAULT_AFFIRMATION;
}

let isOverlayVisible = false;

async function showYoutubeBlocker() {
  if (isOverlayVisible) return;

  isOverlayVisible = true;

  window.postMessage({ type: BLOCKER_MESSAGE_TYPES.blockerLock }, "*");

  const host = document.createElement("div");
  document.body.appendChild(host);

  const shadowRoot = host.attachShadow({ mode: "closed" });

  const sheet = new CSSStyleSheet();
  sheet.replaceSync(`
    .overlay-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(0, 0, 0, 0.6);
        backdrop-filter: grayscale(100%) brightness(55%);
        -webkit-backdrop-filter: grayscale(100%) brightness(55%);
        z-index: 2147483647;
        display: flex;
        justify-content: center;
        align-items: center;
        pointer-events: auto;
    }

    .overlay-popup {
        background: #f8f8f7;
        padding: 32px 40px;
        border-radius: 14px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
        font-family: Arial, sans-serif;
        max-width: 560px;
        text-align: center;
        -webkit-user-select: none; /* Safari */
        -ms-user-select: none; /* IE 10 and Old Edge */
        user-select: none; /* Standard syntax (Chrome, Firefox, Opera) */
    }

    .overlay-popup h2 {
        font-size: 30px;
        margin: 0 0 12px;
        font-weight: 700;
    }

    .overlay-subtitle {
        font-size: 18px;
        line-height: 1.4;
        color: #444;
        margin: 0 0 18px;
    }

    .affirmation-box {
        margin: 0 auto 22px;
        padding: 14px 18px;
        background: #eceff1;
        border-left: 3px solid #7a8793;
        border-radius: 8px;
        color: #2f3437;
        font-size: 16px;
        line-height: 1.45;
        text-align: left;
    }

    .overlay-input {
        width: 100%;
        min-height: 120px;
        resize: none;
        overflow-y: auto;
        scrollbar-gutter: stable;
        font-family: Arial, sans-serif;
        line-height: 1.4;
        padding: 12px;
        font-size: 16px;
        margin-top: 0;
        border: 2px solid #ccc;
        border-radius: 8px;
        outline: none;
        box-sizing: border-box;
    }

    .overlay-input:focus {
        border-color: #6b7280;
    }

    .overlay-btn {
        background-color: #5b6470;
        color: white;
        border: none;
        padding: 11px 24px;
        font-size: 16px;
        border-radius: 8px;
        cursor: pointer;
        margin-top: 18px;
    }

    .overlay-btn:disabled {
        background-color: #d1d5db;
        color: #6b7280;
        cursor: not-allowed;
    }

    `);
  shadowRoot.adoptedStyleSheets = [sheet];

  const backdrop = document.createElement("div");
  backdrop.className = "overlay-backdrop";

  const popup = document.createElement("div");
  popup.className = "overlay-popup";

  const affirmation = await getRequiredAffirmation();

  popup.innerHTML = `
    <h2>YouTube is blocked</h2>
    <p class="overlay-subtitle">Type this affirmation to unlock the page.</p>
    <blockquote id="affirmation-box" class="affirmation-box"></blockquote>
    <textarea id="unlock-input" class="overlay-input" placeholder="Type affirmation here..." autocomplete="off" autofocus></textarea>
    <button id="unlock-btn" class="overlay-btn" disabled>Unlock Page</button>
  `;

  backdrop.appendChild(popup);
  shadowRoot.appendChild(backdrop);

  document.documentElement.classList.add("no-scroll");
  document.body.classList.add("no-scroll");

  const affirmationBox = shadowRoot.getElementById("affirmation-box");
  affirmationBox.textContent = affirmation;

  const unlockInput = shadowRoot.getElementById("unlock-input");
  const unlockBtn = shadowRoot.getElementById("unlock-btn");

  unlockInput.addEventListener("input", (event) => {
    if (event.target.value === affirmation) {
      unlockBtn.disabled = false;
    } else {
      unlockBtn.disabled = true;
    }
  });

  unlockInput.addEventListener("paste", (event) => {
    event.preventDefault();
  });

  function keepFocusIn(event) {
    if (!isOverlayVisible) return;

    if (event.target?.id === "movie_player") {
      event.stopImmediatePropagation();
      unlockInput.focus();
    } else {
      console.log(event.target);
    }
  }

  function blockYoutubeShortcuts(event) {
    if (!isOverlayVisible) return;

    event.stopImmediatePropagation();

    if (event.key === "Tab") {
      event.preventDefault();
    }
  }

  document.addEventListener("focusin", keepFocusIn, true);
  window.addEventListener("keydown", blockYoutubeShortcuts, true);
  window.addEventListener("keyup", blockYoutubeShortcuts, true);
  window.addEventListener("keypress", blockYoutubeShortcuts, true);

  unlockBtn.addEventListener("click", () => {
    host.remove();
    document.documentElement.classList.remove("no-scroll");
    document.body.classList.remove("no-scroll");

    document.removeEventListener("focusin", keepFocusIn, true);

    isOverlayVisible = false;
    window.postMessage({ type: BLOCKER_MESSAGE_TYPES.blockerUnlock }, "*");
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.youtubePageAccessed });
  });
}

function whenBodyReady(callback) {
  if (document.body) {
    callback();
    return;
  }

  const bodyObserver = new MutationObserver(() => {
    if (document.body) {
      bodyObserver.disconnect();
      callback();
    }
  });

  bodyObserver.observe(document.documentElement, {
    childList: true,
  });
}

let prelocked = true;
function prelockEvent(event) {
  if (!prelocked) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}

const prelockEvents = ["click", "mousedown"];

prelockEvents.forEach((type) => {
  window.addEventListener(type, prelockEvent, true);
});

function releasePrelock(event) {
  prelockEvents.forEach((type) => {
    window.removeEventListener(type, prelockEvent, true);
  });
}

chrome.runtime.sendMessage(
  {
    type: MESSAGE_TYPES.youtubePageLoaded,
  },
  (response) => {
    if (chrome.runtime.lastError) {
      console.warn("Background unavailable:", chrome.runtime.lastError.message);
      releasePrelock();
      return;
    }

    if (response?.shouldBlock) {
      whenBodyReady(() => {
        showYoutubeBlocker().catch(console.error);
      });
      releasePrelock();
    } else {
      releasePrelock();
    }
  },
);
