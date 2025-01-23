import { init, uiReady, lifecycle } from "senza-sdk";
import { ShakaPlayer } from "./shakaPlayer.js";

const TEST_VIDEO = "https://storage.googleapis.com/shaka-demo-assets/angel-one/dash.mpd";

let player;

let audioLangs = ['en'];
let selectedAudioIndex = 0;
let textLangs = ['en'];
let selectedTextIndex = 0;

window.addEventListener("load", async () => {
  try {
    await init();
    player = new ShakaPlayer(video);
    await player.load(TEST_VIDEO);
    await video.play();

    audioLangs = player.getAudioLanguages();
    textLangs = player.getTextLanguages();
    selectedAudioIndex = audioLangs.indexOf('en');
    selectedTextIndex = audioLangs.indexOf('en');

    console.log("audio", audioLangs, selectedAudioIndex);
    console.log("text", textLangs, selectedTextIndex);

    player.setTextTrackVisibility(true);

    console.log("remote audio", player.remotePlayer.getAudioTracks());
    console.log("remote text", player.remotePlayer.getTextTracks());

    uiReady();
  } catch (error) {
    console.error(error);
  }
});

document.addEventListener("keydown", async function (event) {
  switch (event.key) {
    case "Enter": await toggleBackground(); break;
    case "Escape": video.muted = !video.muted; break;
    case "ArrowUp": changeAudioLang(-1); break;
    case "ArrowDown": changeAudioLang(1); break;
    case "ArrowLeft": changeTextLang(-1); break;
    case "ArrowRight": changeTextLang(1); 
    break;
    default: return;
  }
  event.preventDefault();
});

async function toggleBackground() {
  if (lifecycle.state == lifecycle.UiState.BACKGROUND) {
    await lifecycle.moveToForeground();
  } else {
    // remove this line once the remotePlayer has been updated to sync 
    // automatically regardless of whether seamless switch is enabled
    player.remotePlayer.currentTime = video.currentTime;
    await lifecycle.moveToBackground();
  }
}

function changeAudioLang(delta) {
  selectedAudioIndex = (selectedAudioIndex + delta + audioLangs.length) % audioLangs.length;
  player.selectAudioLanguage(audioLangs[selectedAudioIndex]);
  udpateBanner();
}

function changeTextLang(delta) {
  selectedTextIndex = (selectedTextIndex + delta + textLangs.length) % textLangs.length;
  player.selectTextLanguage(textLangs[selectedTextIndex]);
  udpateBanner();
}

function udpateBanner() {
  banner.innerHTML =
    `audio: ${audioLangs[selectedAudioIndex]}<br>` +
    `text: ${textLangs[selectedTextIndex]}`
}
