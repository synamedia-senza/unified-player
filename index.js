import { init, uiReady } from "senza-sdk";
import { videoManager } from "./videoManager.js";

const ENCRYPTED_TEST_VIDEO = "https://storage.googleapis.com/shaka-demo-assets/angel-one-widevine/dash.mpd";
const WIDEVINE = "https://proxy.uat.widevine.com/proxy";

window.addEventListener("load", async () => {
  try {
    await init();
    videoManager.init(video, WIDEVINE);
    await videoManager.load(ENCRYPTED_TEST_VIDEO);
    videoManager.play();
    uiReady();
  } catch (error) {
    console.error(error);
  }
});

document.addEventListener("keydown", async function (event) {
  switch (event.key) {
    case "Enter": await videoManager.toggleLocalAndRemotePlayback(); break;
    case "Escape": videoManager.playPause(); break;
    case "ArrowLeft": videoManager.skip(-30); break;
    case "ArrowRight": videoManager.skip(30); break;
    default: return;
  }
  event.preventDefault();
});
