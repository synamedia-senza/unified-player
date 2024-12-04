import { init, uiReady } from "senza-sdk";
import { SenzaShakaPlayer } from "./senzaShakaPlayer.js";

const TEST_VIDEO = "https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd";

let player;

window.addEventListener("load", async () => {
  try {
    player = new SenzaShakaPlayer(video);
    await init();
    uiReady();
    await player.load(TEST_VIDEO);
    await player.play();
  } catch (error) {
    console.error(error);
  }
});

document.addEventListener("keydown", async function (event) {
  switch (event.key) {
    case "Enter": await player.togglePlayback(); break;
    case "Escape": await player.playPause(); break;
    case "ArrowLeft": await player.skip(-30); break;
    case "ArrowRight": await player.skip(30); break;
    default: return;
  }
  event.preventDefault();
});
