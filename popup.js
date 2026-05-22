import { getDaysSinceLocalDate, getLocalDateKey } from "./dateUtils.js";

async function onStartup() {
  const today = getLocalDateKey();
  const data = await chrome.storage.local.get([
    "lastDate",
    "blockAllYoutube",
    "longestStreak",
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
    await chrome.storage.local.set({ longestStreak: longestStreak });
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
}

// Run the function as soon as the popup opens
document.addEventListener("DOMContentLoaded", onStartup);
