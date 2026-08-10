import { getLocalDateKey, getDaysSinceLocalDate } from "./shared/dateUtils.js";
import { STORAGE_KEYS } from "./shared/storageKeys.js";

// =========================
// Constants
// =========================

const BLOCK_REASONS = {
  blocked: "blocked",
  usedToday: "usedToday",
  time: "time",
};

const MESSAGE_TYPES = {
  youtubePageLoaded: "YOUTUBE_PAGE_LOADED",
  youtubePageAccessed: "YOUTUBE_PAGE_ACCESSED",
};

const NEW_SESSION_TRANSITIONS = new Set([
  "typed",
  "auto_bookmark",
  "generated",
]);

const youtubeSessions = new Map();
const pendingResolvers = new Map();

let accessUpdatePromise = Promise.resolve();

// =========================
// Date / streak helpers
// =========================

function isAfter8() {
  return new Date().getHours() >= 20;
}

function hasUsedToday(lastDate) {
  return lastDate === getLocalDateKey();
}

function getCurrentStreak(lastDate) {
  if (!lastDate) return 0;
  return getDaysSinceLocalDate(lastDate);
}

async function getYoutubeState() {
  const data = await chrome.storage.local.get([
    STORAGE_KEYS.lastDate,
    STORAGE_KEYS.blockAllYoutube,
    STORAGE_KEYS.longestStreak,
  ]);

  return {
    lastDate: data[STORAGE_KEYS.lastDate] || "",
    blockAllYoutube: data[STORAGE_KEYS.blockAllYoutube] ?? false,
    longestStreak: data[STORAGE_KEYS.longestStreak] ?? 0,
  };
}

async function recordYoutubeAccess() {
  const today = getLocalDateKey();
  const { lastDate, longestStreak } = await getYoutubeState();

  // Already recorded today, so don't reset anything again.
  if (lastDate === today) {
    return;
  }

  const currentStreak = getCurrentStreak(lastDate);
  const newLongestStreak = Math.max(longestStreak, currentStreak);

  await chrome.storage.local.set({
    [STORAGE_KEYS.lastDate]: today,
    [STORAGE_KEYS.longestStreak]: newLongestStreak,
  });

  await updateBadgeUI(today, newLongestStreak);
}

function queueYoutubeAccessUpdate() {
  accessUpdatePromise = accessUpdatePromise
    .catch((error) => {
      console.error("Previous YouTube access update failed:", error);
    })
    .then(recordYoutubeAccess);

  return accessUpdatePromise;
}

// =========================
// Badge UI
// =========================

async function updateBadgeUI(lastDate = null, longestStreak = null) {
  if (lastDate === null || longestStreak === null) {
    const state = await getYoutubeState();

    lastDate ??= state.lastDate;
    longestStreak ??= state.longestStreak;
  }

  const daysSince = getCurrentStreak(lastDate);
  const color = daysSince === 0 ? "#dc3545" : "#28a745";

  await Promise.all([
    chrome.action.setBadgeText({ text: daysSince.toString() }),
    chrome.action.setBadgeBackgroundColor({ color }),
  ]);

  if (daysSince > longestStreak) {
    await chrome.storage.local.set({
      [STORAGE_KEYS.longestStreak]: daysSince,
    });
  }
}

// =========================
// Blocking decision
// =========================

async function getBlockReason() {
  const { lastDate, blockAllYoutube } = await getYoutubeState();

  if (blockAllYoutube) {
    return BLOCK_REASONS.blocked;
  }

  if (hasUsedToday(lastDate)) {
    return BLOCK_REASONS.usedToday;
  }

  if (isAfter8()) {
    return BLOCK_REASONS.time;
  }

  return "";
}

function isTopFrameNavigation(details) {
  return details.frameId === 0;
}

function isBrowserBackForwardNavigation(details) {
  return details.transitionQualifiers.includes("forward_back");
}

function isNewYoutubeSession(details) {
  return (
    NEW_SESSION_TRANSITIONS.has(details.transitionType) &&
    !isBrowserBackForwardNavigation(details)
  );
}

function isYoutubeUrl(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname === "youtube.com" || hostname.endsWith(".youtube.com");
  } catch {
    return false;
  }
}

async function redirectToBlockedPage(tabId, reason) {
  await chrome.tabs.update(tabId, {
    url: chrome.runtime.getURL(`blocked.html?reason=${reason}`),
  });
}

function waitForSessionDecision(tabId, timeoutMs = 1000) {
  if (youtubeSessions.has(tabId)) {
    return Promise.resolve(youtubeSessions.get(tabId));
  }

  const { promise, resolve } = Promise.withResolvers();
  const timeoutId = setTimeout(() => {
    pendingResolvers.delete(tabId);
    resolve(true);
  }, timeoutMs);

  pendingResolvers.set(tabId, (shouldBlock) => {
    clearTimeout(timeoutId);
    pendingResolvers.delete(tabId);
    resolve(shouldBlock);
  });

  return promise;
}

function clearTabSession(tabId) {
  youtubeSessions.delete(tabId);

  const resolve = pendingResolvers.get(tabId);
  if (resolve) {
    pendingResolvers.delete(tabId);
    resolve(false);
  }
}

// =========================
// Runtime messages
// =========================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  if (message.type === MESSAGE_TYPES.youtubePageLoaded) {
    waitForSessionDecision(tabId).then((shouldBlock) => {
      sendResponse({ shouldBlock });
    });
    return true;
  }

  if (message.type === MESSAGE_TYPES.youtubePageAccessed) {
    if (tabId !== undefined) {
      youtubeSessions.set(tabId, false);
    }

    queueYoutubeAccessUpdate()
      .then(() => {
        sendResponse({ ok: true });
      })
      .catch((error) => {
        console.error("Failed to record YouTube access:", error);
        sendResponse({ ok: false, error: String(error) });
      });

    return true;
  }

  return false;
});

// =========================
// Navigation tracking
// =========================

chrome.webNavigation.onCommitted.addListener((details) => {
  if (!isTopFrameNavigation(details)) return;
  if (isYoutubeUrl(details.url)) return;
  clearTabSession(details.tabId);
});

chrome.webNavigation.onCommitted.addListener(
  async (details) => {
    if (!isTopFrameNavigation(details)) return;

    const tabId = details.tabId;

    if (youtubeSessions.has(tabId)) {
      return;
    }

    console.log(
      "Transition:",
      details.transitionType,
      "Qualifiers:",
      details.transitionQualifiers,
      "URL:",
      details.url,
    );

    if (!isNewYoutubeSession(details)) {
      if (pendingResolvers.has(tabId)) {
        const resolve = pendingResolvers.get(tabId);
        resolve(false);
      }
      youtubeSessions.set(tabId, false);
      return;
    }

    const reason = await getBlockReason();

    if (reason) {
      youtubeSessions.set(tabId, false);
      await redirectToBlockedPage(tabId, reason);
      return;
    }

    // Record for the YouTube page to show affirmation UI
    if (pendingResolvers.has(tabId)) {
      const resolve = pendingResolvers.get(tabId);
      resolve(true);
    }
    youtubeSessions.set(tabId, true);

    console.log("New YouTube session detected:", {
      tabId,
      source: details.referrer || "Direct/Typed",
    });
  },
  {
    url: [{ hostSuffix: "youtube.com" }],
  },
);

// =========================
// Startup
// =========================

chrome.runtime.onStartup.addListener(() => {
  updateBadgeUI().catch(console.error);
});

chrome.runtime.onInstalled.addListener(() => {
  updateBadgeUI().catch(console.error);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  clearTabSession(tabId);
});
