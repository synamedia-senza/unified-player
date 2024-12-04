import { init, uiReady } from "senza-sdk";
import { SenzaShakaPlayer } from "./senzaShakaPlayer.js";

const TEST_VIDEO = "https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd";

let player;

window.addEventListener("load", async () => {
  try {
    await init();
    player = new SenzaShakaPlayer(video);
    await player.load(TEST_VIDEO);
    player.play();
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
  if (player.isInRemotePlayback) {
    await player.moveToLocalPlayback();
  } else {
    player.moveToRemotePlayback();
  }
}

async function playPause() {
  if (player.paused) {
    await player.play();
  } else {
    await player.pause();
  }
}

function skip(seconds) {
  player.currentTime = player.currentTime + seconds;
}
