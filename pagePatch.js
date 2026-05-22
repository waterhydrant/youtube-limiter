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

    if (event.data?.type === "YT_BLOCKER_LOCK") {
      blockerActive = true;
    }

    if (event.data?.type === "YT_BLOCKER_UNLOCK") {
      blockerActive = false;
      document.querySelector("video").play();
    }
  });
})();
