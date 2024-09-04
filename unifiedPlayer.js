import { remotePlayer, lifecycle } from "senza-sdk";
import shaka from "shaka-player";

/**
 * UnifiedPlayer class that handles both local and remote playback.
 * 
 * @class UnifiedPlayer
 * @property {boolean} isInRemotePlayback - Indicates whether the player is in remote playback.
 * @property {number} currentTime - Gets or sets the current playback time.
 * @property {number} duration - Gets the duration of the media.
 * @property {boolean} paused - Indicates whether the player is paused.
 * @fires UnifiedPlayer#ended - Indicates that the media has ended.
 * @fires UnifiedPlayer#error - Indicates that an error occurred.
 * @fires UnifiedPlayer#timeupdate - Indicates that the current playback time has changed.
 * 
 * @example
 * import { UnifiedPlayer } from "./unifiedPlayer.js";
 * 
 * try {
 *   const videoElement = document.getElementById("video");
 *   const unifiedPlayer = new UnifiedPlayer(videoElement);
 *   await unifiedPlayer.load("http://playable.url/file.mpd");
 *   await unifiedPlayer.play(); // Will start the playback on the local player
 *   document.addEventListener("keydown", async function (event) {
 *     switch (event.key) {
 *       case "ArrowLeft": {
 *         await unifiedPlayer.moveToLocalPlayback(); // Will move the playback to the local player
 *         break;
 *       }
 *       case "ArrowRight": {
 *         unifiedPlayer.moveToRemotePlayback(); // Will move the playback to the remote player
 *         break;
 *       }
 *       default: return;
 *     }
 *     event.preventDefault();
 *   });
 * 
 * } catch (err) {
 *   console.error("UnifiedPlayer failed with error", err);
 * }
 */
export class UnifiedPlayer extends EventTarget {
  /**
   * Creates an instance of UnifiedPlayer.
   * 
   * @param {HTMLVideoElement} videoElement - The video element to be used for local playback.
   */
  constructor(videoElement) {
    super();
    this.videoElement = videoElement;
    this.localPlayer = new shaka.Player(this.videoElement);
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
      this.videoElement.currentTime = this.remotePlayer.currentTime;
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

    this.videoElement.addEventListener("timeupdate", () => {
      if (this.isInRemotePlayback) {
        return;
      }
      console.log("localPlayer timeupdate");
      this.remotePlayer.currentTime = this.videoElement.currentTime;
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

  /**
   * Indicates whether the player is paused.
   * 
   * @readonly
   * @type {boolean}
   */
  get paused() {
    return this.isInRemotePlayback ? false : this.videoElement.paused;
  }

  /**
   * Gets the current playback time.
   * 
   * @type {number}
   */
  get currentTime() {
    return this.isInRemotePlayback ? remotePlayer.currentTime : this.videoElement.currentTime;
  }

  /**
   * Sets the current playback time.
   * NOTE: When in remote playback, this will not affect the remote player.
   * @param {number} time - The time to set the current playback to.
   */
  set currentTime(time) {
    if (this.isInRemotePlayback) {
      console.warn("Setting currentTime while in remote playback is not supported yet.");
    } else {
      remotePlayer.currentTime = this.videoElement.currentTime = time;
    }
  }

  /**
   * Gets the duration of the media.
   * 
   * @readonly
   * @type {number}
   */
  get duration() {
    return this.videoElement.duration;
  }

  /**
   * Loads a media URL into both local and remote players.
   * 
   * @param {string} url - The URL of the media to load.
   * @returns {Promise<void>}
   */
  async load(url) {
    try {
      await this._localPlayerLoad(url);
      await this._remotePlayerLoad(url);
    } catch (error) {
      console.log("Couldn't load.");
    }
  }

  /**
   * Plays the media.
   * Will start the playback on the local player, to move the playback to the remote player call {@link moveToRemotePlayback}.
   * 
   * @returns {Promise<void>}
   */
  async play() {
    await this._localPlayerPlay();
    this._remotePlayerPlay();
  }

  /**
   * Pauses the media on both local and remote players.
   * NOTE: When in remote playback, this will not have any affect.
   */
  pause() {
    if (this.isInRemotePlayback) {
      console.warn("Pausing while in remote playback is not supported yet.");
    } else {
      this._localPlayerPause();
      this._remotePlayerPause();
    }
  }

  /**
   * Moves playback to local player.
   * 
   * @returns {Promise<void>}
   */
  async moveToLocalPlayback() {
    this._localPlayerPlay();
    lifecycle.moveToForeground();
  }

  /**
   * Moves playback to remote player.
   */
  moveToRemotePlayback() {
    lifecycle.moveToBackground();
  }

  /**
   * Loads a media URL into the local player.
   * 
   * @private
   * @param {string} url - The URL of the media to load.
   * @returns {Promise<void>}
   */
  _localPlayerLoad(url) {
    return this.localPlayer.load(url);
  }

  /**
   * Plays the media on the local player.
   * 
   * @private
   * @returns {Promise<void>}
   */
  _localPlayerPlay() {
    return this.videoElement.play();
  }

  /**
   * Pauses the media on the local player.
   * 
   * @private
   */
  _localPlayerPause() {
    this.videoElement.pause();
  }

  /**
   * Loads a media URL into the remote player.
   * 
   * @private
   * @param {string} url - The URL of the media to load.
   * @returns {Promise<void>}
   */
  _remotePlayerLoad(url) {
    return remotePlayer.load(url);
  }

  /**
   * Plays the media on the remote player.
   * 
   * @private
   */
  _remotePlayerPlay() {
    remotePlayer.play(false);
  }

  /**
   * Pauses the media on the remote player.
   * 
   * @private
   */
  _remotePlayerPause() {
    remotePlayer.pause();
  }
}