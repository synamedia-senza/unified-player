import { remotePlayer, lifecycle } from "senza-sdk";
import shaka from "shaka-player";

export class UnifiedPlayer extends EventTarget {
  constructor(videoElement) {
    super();
    this.localPlayer = new shaka.Player(videoElement);
    this.remotePlayer = remotePlayer;
    this.isInRemotePlayback = false;

    this.remotePlayer.addEventListener("ended", () => {
      console.log("remotePlayer ended");
      lifecycle.moveToForeground();
      this.dispatchEvent(new Event("ended"));
    });

    this.remotePlayer.addEventListener("error", (event) => {
      console.log("remotePlayer error:", event.detail.errorCode, event.detail.message);
      this.dispatchEvent(new CustomEvent("error", event));
    });

    this.remotePlayer.addEventListener("timeupdate", () => {
      if (!this.isInRemotePlayback) {
        return;
      }
      console.log("remotePlayer timeupdate");
      this._localPlayerMedia().currentTime = this.remotePlayer.currentTime;
      this.dispatchEvent(new Event("timeupdate"));
    });

    this.localPlayer.addEventListener("ended", () => {
      console.log("localPlayer ended");
      this.dispatchEvent(new Event("ended"));
    });

    this.localPlayer.addEventListener("error", (event) => {
      console.log("localPlayer error:", event.detail.errorCode, event.detail.message);
      this.dispatchEvent(new CustomEvent("error", event));
    });

    videoElement.addEventListener("timeupdate", () => {
      if (this.isInRemotePlayback) {
        return;
      }
      console.log("localPlayer timeupdate");
      this.remotePlayer.currentTime = this._localPlayerMedia().currentTime;
      this.dispatchEvent(new Event("timeupdate"));
    });

    lifecycle.addEventListener("onstatechange", (event) => {
      console.log("lifecycle state change", event.state);
      switch (event.state) {
        case "background":
          this._localPlayerPause();
        case "inTransitionToBackground":
          this.isInRemotePlayback = true;
          break;
        case "foreground":
        case "inTransitionToForeground":
          this.isInRemotePlayback = false;
          break;
      }
    });
  }
  get paused() {
    return !this.isInRemotePlayback || this._localPlayerMedia().paused;
  }

  get currentTime() {
    return this.isInRemotePlayback ? remotePlayer.currentTime : this._localPlayerMedia().currentTime;
  }

  set currentTime(time) {
    if (this.isInRemotePlayback) {
      console.warn("Setting currentTime while in remote playback is not supported yet.");
    } else {
      remotePlayer.currentTime = this._localPlayerMedia().currentTime = time;
    }
  }

  async load(url) {
    try {
      await this._localPlayerLoad(url);
      await this._remotePlayerLoad(url);
    } catch (error) {
      console.log("Couldn't load.");
    }
  }

  async play() {
    await this._localPlayerPlay();
    this._remotePlayerPlay();
  }

  pause() {
    if (this.isInRemotePlayback) {
      console.warn("Pausing while in remote playback is not supported yet.");
    } else {
      this._localPlayerPause();
      this._remotePlayerPause();
    }
  }

  async moveToLocalPlayback() {
    this._localPlayerPlay();
    lifecycle.moveToForeground();
  }

  moveToRemotePlayback() {
    lifecycle.moveToBackground();
  }

  _localPlayerLoad(url) {
    return this.localPlayer.load(url);
  }

  _localPlayerMedia() {
    return this.localPlayer.getMediaElement();
  }

  _localPlayerPlay() {
    return this._localPlayerMedia().play();
  }

  _localPlayerPause() {
    this._localPlayerMedia().pause();
  }

  _remotePlayerLoad(url) {
    return remotePlayer.load(url);
  }

  _remotePlayerPlay() {
    remotePlayer.play(false);
  }

  _remotePlayerPause() {
    remotePlayer.pause();
  }
}