import {init, lifecycle, uiReady} from "senza-sdk";
import { UnifiedPlayer } from "./unifiedPlayer.js";

const TEST_VIDEO = "https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd";

let unifiedPlayer;

window.addEventListener("load", async () => {
  try {
    await init();
    const state = await lifecycle.getState();
    console.log("lifecycle initial state ", state);
    unifiedPlayer = new UnifiedPlayer(video);
    unifiedPlayer.isInRemotePlayback = state === "background" || state === "inTransitionToBackground";

    uiReady();
    await unifiedPlayer.load(TEST_VIDEO);
    await unifiedPlayer.play();
  } catch (error) {
    console.error(error);
  }
});

document.addEventListener("keydown", async function (event) {
  switch (event.key) {
    case "Enter": await togglePlayback(); break;
    case "Escape": playPause(); break;
    case "ArrowLeft": skip(-30); break;
    case "ArrowRight": skip(30); break;
    default: return;
  }
  event.preventDefault();
});

async function togglePlayback() {
  if (unifiedPlayer.isInRemotePlayback) {
    await unifiedPlayer.moveToLocalPlayback();
  } else {
    unifiedPlayer.moveToRemotePlayback();
  }
}

function playPause() {
  if (unifiedPlayer.paused) {
    unifiedPlayer.play();
  } else {
    unifiedPlayer.pause();
  }
}

function skip(seconds) {
  unifiedPlayer.currentTime = unifiedPlayer.currentTime + seconds;
}
