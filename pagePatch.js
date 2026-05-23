import { BLOCKER_MESSAGE_TYPES } from "./blocker_messages.js";

(() => {
  const nativePlay = HTMLMediaElement.prototype.play;
  let blockerActive = false;

  HTMLMediaElement.prototype.play = function (...args) {
    if (blockerActive) {
      return Promise.reject();
    }
    return nativePlay.apply(this, args);
  };

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;

    if (event.data?.type === BLOCKER_MESSAGE_TYPES.blockerLock) {
      blockerActive = true;
    }

    if (event.data?.type === BLOCKER_MESSAGE_TYPES.blockerUnlock) {
      blockerActive = false;
      document.querySelector("video").play();
    }
  });
})();
