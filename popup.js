import { getDaysSinceLocalDate, getLocalDateKey } from "./shared/dateUtils.js";
import { STORAGE_KEYS } from "./shared/storageKeys.js";

const DEFAULT_AFFIRMATION =
  "I affirm that watching YouTube is the best use of my limited energy right now. I am choosing it intentionally, not because I am avoiding real rest, work, movement, or something more restorative.";

async function onStartup() {
  const today = getLocalDateKey();
  const data = await chrome.storage.local.get([
    STORAGE_KEYS.lastDate,
    STORAGE_KEYS.blockAllYoutube,
    STORAGE_KEYS.longestStreak,
    STORAGE_KEYS.affirmation
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

  const toggleContainer = document.getElementById("toggleContainer");
  const blockAllToggle = document.getElementById("blockAllToggle");

  blockAllToggle.checked = data.blockAllYoutube ?? false;
  toggleContainer.offsetHeight;
  requestAnimationFrame(() => {
    toggleContainer.classList.remove("no-transition");
  });

  blockAllToggle.addEventListener("change", () => {
    chrome.storage.local.set({
      blockAllYoutube: blockAllToggle.checked,
    });
  });

  const affirmationInput = document.getElementById("affirmationInput");
  const affirmation = data.affirmation || DEFAULT_AFFIRMATION;
  affirmationInput.value = affirmation;

  const affirmationSaveBtn = document.getElementById("saveAffirmationBtn");
  const affirmationResetBtn = document.getElementById("resetAffirmationBtn");
  affirmationSaveBtn.addEventListener("click", async () => {
    const affirmation = affirmationInput.value.trim();
    await chrome.storage.local.set({affirmation: affirmation});
  });
  affirmationResetBtn.addEventListener("click", () => {
    chrome.storage.local.set({ affirmation: DEFAULT_AFFIRMATION }); 
    affirmationInput.value = DEFAULT_AFFIRMATION;
  })
}

// Run the function as soon as the popup opens
document.addEventListener("DOMContentLoaded", onStartup);
