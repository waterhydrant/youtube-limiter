const MESSAGE_TYPES = {
  youtubePageLoaded: "YOUTUBE_PAGE_LOADED",
  youtubePageAccessed: "YOUTUBE_PAGE_ACCESSED",
};

const BLOCKER_MESSAGE_TYPES = {
  blockerLock: "YT_BLOCKER_LOCK",
  blockerUnlock: "YT_BLOCKER_UNLOCK",
};

const AFFIRMATION =
  "I affirm that watching YouTube is the best use of my limited energy right now. I am choosing it intentionally, not because I am avoiding real rest, work, movement, or something more restorative.";

let isOverlayVisible = false;

function showYoutubeBlocker() {
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
        background-color: rgba(0, 0, 0, 0.7);
        z-index: 2147483647;
        display: flex;
        justify-content: center;
        align-items: center;
        pointer-events: auto;
    }

    .overlay-popup {
        background: white;
        padding: 32px 40px;
        border-radius: 14px;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
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
        background: #f6f7f8;
        border-left: 3px solid #f59e0b;
        border-radius: 8px;
        color: #333;
        font-size: 16px;
        line-height: 1.45;
        text-align: left;
    }

    .overlay-input {
        width: 100%;
        min-height: 96px;
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
        border-color: #007bff;
    }

    .overlay-btn {
        background-color: #007bff;
        color: white;
        border: none;
        padding: 11px 24px;
        font-size: 16px;
        border-radius: 8px;
        cursor: pointer;
        margin-top: 18px;
    }

    .overlay-btn:disabled {
        background-color: #d4d4d4;
        color: #666;
        cursor: not-allowed;
    }

    `);
  shadowRoot.adoptedStyleSheets = [sheet];

  const backdrop = document.createElement("div");
  backdrop.className = "overlay-backdrop";

  const popup = document.createElement("div");
  popup.className = "overlay-popup";

  popup.innerHTML = `
    <h2>YouTube is blocked</h2>
    <p class="overlay-subtitle">Type this affirmation to unlock the page.</p>
    <blockquote class="affirmation-box">${AFFIRMATION}</blockquote>
    <textarea id="unlock-input" class="overlay-input" placeholder="Type affirmation here..." autocomplete="off" autofocus></textarea>
    <button id="unlock-btn" class="overlay-btn" disabled>Unlock Page</button>
  `;

  backdrop.appendChild(popup);
  shadowRoot.appendChild(backdrop);

  document.documentElement.classList.add("no-scroll");
  document.body.classList.add("no-scroll");

  const unlockInput = shadowRoot.getElementById("unlock-input");
  const unlockBtn = shadowRoot.getElementById("unlock-btn");

  unlockInput.addEventListener("input", (event) => {
    if (event.target.value === AFFIRMATION) {
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
      whenBodyReady(showYoutubeBlocker);
      releasePrelock();
    } else {
      releasePrelock();
    }
  },
);
