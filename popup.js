import { getDaysSinceLocalDate, getLocalDateKey } from "./shared/dateUtils.js";
import { STORAGE_KEYS } from "./shared/storageKeys.js";

const DEFAULT_AFFIRMATION =
  "I affirm that watching YouTube is the best use of my limited energy right now. I am choosing it intentionally, not because I am avoiding real rest, work, movement, or something more restorative.";

const AFFIRMATION_MODES = {
  CUSTOM: "custom",
  GENERATED: "generated"
};

const REDIRECT_RULESET_ID = "ruleset_1";

async function isRedirectEnabled() {
  const enabledRulesets =
    await chrome.declarativeNetRequest.getEnabledRulesets();
  return enabledRulesets.includes(REDIRECT_RULESET_ID);
}

async function setRedirectEnabled(enabled) {
  if (enabled) {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: [REDIRECT_RULESET_ID],
    });
  } else {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      disableRulesetIds: [REDIRECT_RULESET_ID],
    });
  }
}

async function onStartup() {
  const today = getLocalDateKey();
  const data = await chrome.storage.local.get([
    STORAGE_KEYS.lastDate,
    STORAGE_KEYS.blockAllYoutube,
    STORAGE_KEYS.longestStreak,
    STORAGE_KEYS.affirmation,
    STORAGE_KEYS.affirmationMode,
  ]);

  const displayElement = document.getElementById("displayStatus");

  // Check if the stored data is actually from today
  if (data.lastDate === today) {
    displayElement.textContent = "Locked";
    displayElement.classList.add("locked");
  } else {
    displayElement.textContent = "Available";
  }

  const daysSince = getDaysSinceLocalDate(data.lastDate);

  document.getElementById("displayDaysSince").textContent =
    daysSince === null ? "0" : daysSince.toString();

  const longestStreak = data.longestStreak ?? 0;
  if (daysSince > longestStreak) {
    await chrome.storage.local.set({ longestStreak: daysSince });
  }
  document.getElementById("displayLongestStreak").textContent =
    longestStreak.toString();

  const blockToggleContainer = document.getElementById("blockToggleContainer");
  const blockToggle = document.getElementById("blockToggle");

  const redirectToggleContainer = document.getElementById(
    "redirectToggleContainer",
  );
  const redirectToggle = document.getElementById("redirectToggle");

  blockToggle.checked = data.blockAllYoutube ?? false;
  redirectToggle.checked = await isRedirectEnabled();
  blockToggle.offsetHeight;
  requestAnimationFrame(() => {
    blockToggleContainer.classList.remove("no-transition");
    redirectToggleContainer.classList.remove("no-transition");
  });

  blockToggle.addEventListener("change", () => {
    chrome.storage.local.set({
      blockAllYoutube: blockToggle.checked,
    });
  });

  redirectToggle.addEventListener("change", async () => {
    await setRedirectEnabled(redirectToggle.checked);
  });

  const affirmationInput = document.getElementById("affirmationInput");
  const affirmationDescription = document.getElementById(
    "affirmationDescription",
  );
  const affirmationSaveBtn = document.getElementById("saveAffirmationBtn");
  const affirmationResetBtn = document.getElementById("resetAffirmationBtn");

  const generatedToggleContainer = document.getElementById(
    "generatedToggleContainer",
  );
  const generatedAffirmationToggle = document.getElementById(
    "generatedAffirmationToggle",
  );

  const affirmation = data.affirmation || DEFAULT_AFFIRMATION;
  affirmationInput.value = affirmation;

  let affirmationMode =
    data.affirmationMode || AFFIRMATION_MODES.CUSTOM;

  let statusClearTimeout = null;
  const affirmationSaveStatus = document.getElementById(
    "affirmationSaveStatus",
  );

  function showAffirmationStatus(message) {
    clearTimeout(statusClearTimeout);

    affirmationSaveStatus.textContent = message;

    statusClearTimeout = setTimeout(() => {
      affirmationSaveStatus.textContent = "";
    }, 1600);
  }

  function renderAffirmationMode() {
    const usingGenerated =
      affirmationMode === AFFIRMATION_MODES.GENERATED;

    generatedAffirmationToggle.checked = usingGenerated;

    affirmationInput.disabled = usingGenerated;
    affirmationSaveBtn.disabled = usingGenerated;
    affirmationResetBtn.disabled = usingGenerated;

    affirmationDescription.textContent = usingGenerated
      ? "A different variation will be generated each time YouTube is unlocked."
      : "This is the phrase you must type before unlocking YouTube.";
  }

  renderAffirmationMode();

  generatedToggleContainer.offsetHeight;
  requestAnimationFrame(() => {
    generatedToggleContainer.classList.remove("no-transition");
  });

  generatedAffirmationToggle.addEventListener("change", async () => {
    affirmationMode = generatedAffirmationToggle.checked
      ? AFFIRMATION_MODES.GENERATED
      : AFFIRMATION_MODES.CUSTOM;

    await chrome.storage.local.set({
      [STORAGE_KEYS.affirmationMode]: affirmationMode,
    });

    renderAffirmationMode();

    showAffirmationStatus(
      affirmationMode === AFFIRMATION_MODES.GENERATED
        ? "Using generated variations"
        : "Using custom affirmation",
    );
  });

  affirmationSaveBtn.addEventListener("click", async () => {
    const affirmation = affirmationInput.value.trim();

    if (!affirmation) {
      showAffirmationStatus("Affirmation cannot be empty");
      return;
    }

    await chrome.storage.local.set({
      [STORAGE_KEYS.affirmation]: affirmation,
    });

    showAffirmationStatus("Saved");
  });

  affirmationResetBtn.addEventListener("click", async () => {
    await chrome.storage.local.set({
      [STORAGE_KEYS.affirmation]: DEFAULT_AFFIRMATION,
    });

    affirmationInput.value = DEFAULT_AFFIRMATION;

    showAffirmationStatus("Reset to default");
  });
}

// Run the function as soon as the popup opens
document.addEventListener("DOMContentLoaded", onStartup);
