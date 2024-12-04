import {init, uiReady} from "senza-sdk";
import { UnifiedPlayer } from "./unifiedPlayer.js";

const TEST_VIDEO = "https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd";

let unifiedPlayer;

window.addEventListener("load", async () => {
  try {
    unifiedPlayer = new UnifiedPlayer(video);
    await init();
    uiReady();
    await unifiedPlayer.load(TEST_VIDEO);
    await unifiedPlayer.play();
  } catch (error) {
    console.error(error);
  }
});

document.addEventListener("keydown", async function (event) {
  switch (event.key) {
    case "Enter": await unifiedPlayer.togglePlayback(); break;
    case "Escape": await unifiedPlayer.playPause(); break;
    case "ArrowLeft": await unifiedPlayer.skip(-30); break;
    case "ArrowRight": await unifiedPlayer.skip(30); break;
    default: return;
  }
  event.preventDefault();
});
