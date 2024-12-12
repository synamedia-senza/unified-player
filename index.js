import { init, uiReady, lifecycle } from "senza-sdk";
import { SenzaShakaPlayer } from "./senzaShakaPlayer.js";

const TEST_VIDEO = "https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd";

let player;

window.addEventListener("load", async () => {
  try {
    await init();
    player = new SenzaShakaPlayer(video);
    await player.load(TEST_VIDEO);
    await video.play();
    uiReady();
  } catch (error) {
    console.error(error);
  }
});

document.addEventListener("keydown", async function (event) {
  switch (event.key) {
    case "Enter": await togglePlayback(); break;
    case "Escape": await playPause(); break;
    case "ArrowLeft": skip(-30); break;
    case "ArrowRight": skip(30); break;
    default: return;
  }
  event.preventDefault();
});

async function togglePlayback() {
  if (lifecycle.state == lifecycle.UiState.BACKGROUND) {
    await player.moveToLocalPlayback();
  } else {
    await player.moveToRemotePlayback();
  }
}

async function playPause() {
  if (video.paused) {
    await video.play();
  } else {
    await video.pause();
  }
}

function skip(seconds) {
  video.currentTime = video.currentTime + seconds;
}
