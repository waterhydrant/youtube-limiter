const BLOCK_REASONS = {
  blocked: {
    title: "YouTube is fully blocked.",
    message:
      "YouTube is currently disabled by your blocker settings. This page is unavailable until you change that setting.",
  },

  usedToday: {
    title: "You already used YouTube today.",
    message:
      "Your daily YouTube session has already been used. Come back tomorrow if it is still worth your time.",
  },

  time: {
    title: "YouTube is blocked after 8 PM.",
    message:
      "It is past your cutoff time. Protect your sleep, attention, and recovery by staying off YouTube tonight.",
  },

  unknown: {
    title: "YouTube is blocked right now.",
    message: "This page is unavailable based on your current YouTube rules.",
  },
};

function getBlockReasonFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("reason") || "unknown";
}

function getReasonData(reason) {
  return BLOCK_REASONS[reason] ?? BLOCK_REASONS.unknown;
}

function setText(id, text) {
  const element = document.getElementById(id);

  if (!element) {
    console.warn(`Missing element with id: ${id}`);
    return;
  }

  element.textContent = text;
}

function setupBlockedMessage() {
  const reason = getBlockReasonFromURL();
  const data = getReasonData(reason);

  document.title = data.title;

  setText("blocked-title", data.title);
  setText("blocked-message", data.message);
}

function setupButtons() {
  const closeBtn = document.getElementById("close-tab-btn");
  const backBtn = document.getElementById("back-btn");

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      window.close();

      // window.close() may fail if the tab was not opened by script.
      // In that case, make the button still do something useful.
      setTimeout(() => {
        if (!document.hidden) {
          location.href = "about:blank";
        }
      }, 100);
    });
  }

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      if (history.length > 2) {
        window.history.go(-2);
      } else {
        location.href = "about:blank";
      }
    });
  }
}

function init() {
  setupBlockedMessage();
  setupButtons();
}

document.addEventListener("DOMContentLoaded", init);
