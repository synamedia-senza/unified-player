import { remotePlayer, lifecycle } from "senza-sdk";
import shaka from "shaka-player";
/**
 * SenzaShakaPlayer subclass of Shaka that handles both local and remote playback.
 *
 * @class SenzaShakaPlayer
 * @property {number} currentTime - Gets or sets the current playback time.
 * @property {boolean} paused - Indicates whether the player is paused.
 * @property {number} playbackRate - Gets or sets the playback rate. NOTE currently supported only on local player.
 * @fires SenzaShakaPlayer#ended - Indicates that the media has ended.
 * @fires SenzaShakaPlayer#error - Indicates that an error occurred.
 * @fires SenzaShakaPlayer#timeupdate - Indicates that the current playback time has changed.
 * @fires SenzaShakaPlayer#canplay - Indicates that the media is ready to play. NOTE currently supported only via local player.
 * @fires SenzaShakaPlayer#seeking - Indicates that the player is seeking. NOTE currently supported only via local player.
 * @fires SenzaShakaPlayer#seeked - Indicates that the player has finished seeking. NOTE currently supported only via local player.
 * @fires SenzaShakaPlayer#loadedmetadata - Indicates that the player has loaded metadata. NOTE currently supported only via local player.
 * @fires SenzaShakaPlayer#waiting - Indicates that the player is waiting for data. NOTE currently supported only via local player.
  *
 * @example
 * import { SenzaShakaPlayer } from "./senzaShakaPlayer.js";
 *
 * try {
 *   const videoElement = document.getElementById("video");
 *   const player = new SenzaShakaPlayer(videoElement);
 *   await player.load("http://playable.url/file.mpd");
 *   await player.play(); // Will start the playback on the local player
 *   document.addEventListener("keydown", async function (event) {
 *     switch (event.key) {
 *       case "ArrowLeft": {
 *         await player.moveToLocalPlayback(); // Will move the playback to the local player
 *         break;
 *       }
 *       case "ArrowRight": {
 *         player.moveToRemotePlayback(); // Will move the playback to the remote player
 *         break;
 *       }
 *       default: return;
 *     }
 *     event.preventDefault();
 *   });
 *
 * } catch (err) {
 *   console.error("SenzaShakaPlayer failed with error", err);
 * }
 */
export class SenzaShakaPlayer extends shaka.Player {
  /**
   * Creates an instance of SenzaShakaPlayer, which is a subclass of shaka.Player.
   *
   * @param {HTMLVideoElement} videoElement - The video element to be used for local playback.
   */
  constructor(videoElement) {
    super(videoElement);
    this.videoElement = videoElement;
    this.remotePlayer = remotePlayer;

    this.remotePlayer.attach(this.videoElement);

    // Remote player events
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
      this.videoElement.currentTime = this.remotePlayer.currentTime;
      this.dispatchEvent(new Event("timeupdate"));
    });

    this.addEventListener("error", (event) => {
      console.log("localPlayer error:", event.detail.errorCode, event.detail.message);
    });

    this.videoElement.addEventListener("timeupdate", () => {
      if (this.isInRemotePlayback) {
        return;
      }
      this.dispatchEvent(new Event("timeupdate"));
    });
  }

  get isInRemotePlayback() {
    return lifecycle.state === lifecycle.UiState.BACKGROUND || lifecycle.state === lifecycle.UiState.IN_TRANSITION_TO_BACKGROUND;
  }

  get playbackRate() {
    if (this.isInRemotePlayback) {
      console.warn("playbackRate in remote playback is not supported yet.");
      return this.remotePlayer.playbackRate === undefined ? 1 : this.remotePlayer.playbackRate;
    } else {
      return this.videoElement.playbackRate;
    }
  }

  set playbackRate(rate) {
    if (this.isInRemotePlayback) {
      console.warn("playbackRate in remote playback is not supported yet.");
    }
    this.remotePlayer.playbackRate = this.videoElement.playbackRate = rate;

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
    return this.isInRemotePlayback ? this.remotePlayer.currentTime : this.videoElement.currentTime;
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
      this.remotePlayer.currentTime = this.videoElement.currentTime = time;
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
      await this.remotePlayer.load(url);
    } catch (error) {
      console.log("Couldn't load remote player. Error:", error);
    }
    try {
      await super.load(url);
    } catch (error) {
      console.log("Couldn't load local player. Error:", error);
    }
  }

  /**
   * Toggles between local and remote playback
   */
  async togglePlayback() {
    if (this.isInRemotePlayback) {
      await this.moveToLocalPlayback();
    } else {
      this.moveToRemotePlayback();
    }
  }

  /**
   * Play/Pause the player
   */
  async playPause() {
    await this._fetchUpdatedState();
    if (this.paused) {
      await this.play();
    } else {
      await this.pause();
    }
  }

  /**
   * Seeks the player by x seconds
   */
  skip(seconds) {
    this.currentTime = this.currentTime + seconds;
  }

  /**
   * Plays the media.
   * Will start the playback on the local player, to move the playback to the remote player call {@link moveToRemotePlayback}.
   *
   * @returns {Promise<void>}
   */
  async play() {
    await this.videoElement.play();
    await this.remotePlayer.play(false);
  }

  /**
   * Pauses the media on both local and remote players.
   * NOTE: When in remote playback, this will not have any affect.
   */
  async pause() {
    if (this.isInRemotePlayback) {
      console.warn("Pausing while in remote playback is not supported yet.");
    } else {
      await this.videoElement.pause();
      await this.remotePlayer.pause();
    }
  }

  /**
   * Moves playback to local player.
   *
   * @returns {Promise<void>}
   */
  async moveToLocalPlayback() {
    this.videoElement.play();
    lifecycle.moveToForeground();
  }

  /**
   * Moves playback to remote player.
   */
  moveToRemotePlayback() {
    lifecycle.moveToBackground();
  }

  /**
   * Configures DRM settings.
   *
   * @param {string} server - The DRM server URL.
   * @param {(request: { body : ArrayBuffer | ArrayBufferView | null , headers : { [ key: string ]: string } , uris : string [] }) => void | null} requestFilter - Optional request filter function, allows you to add auth tokens and/or reformat the body.
   * @param {(response: { data : ArrayBuffer | ArrayBufferView , headers : { [ key: string ]: string } , originalUri : string , status ? : number , timeMs ? : number , uri : string }) => void | null} responseFilter - Optional response filter function.
   *
   * @example
   * senzaShakaPlayer.configureDrm("https://proxy.uat.widevine.com/proxy", (request) => {
   *  console.log("Requesting license from Widevine server");
   *  request.headers["Authorization"] = "Bearer <...>";
   * });
   */
  configureDrm(server, requestFilter, responseFilter) {
    this.configure({
      drm: {
        servers: {
          'com.widevine.alpha': server,
        }
      }
    });

    const networkingEngine = this.getNetworkingEngine();

    networkingEngine.registerRequestFilter((type, request) => {
      if (type === shaka.net.NetworkingEngine.RequestType.LICENSE) {
        if (requestFilter) {
          requestFilter(request);
        }
      }
    });

    networkingEngine.registerResponseFilter((type, response) => {
      if (type === shaka.net.NetworkingEngine.RequestType.LICENSE) {
        if (responseFilter) {
          responseFilter(response);
        }
      }
    });

    this.remotePlayer.addEventListener("license-request", async (event) => {
      console.log("remotePlayer", "license-request", "Got license-request event from remote player");

      // Extract license body from event
      const requestBuffer = event?.detail?.licenseRequest;
      const requestBufferStr = String.fromCharCode.apply(null, new Uint8Array(requestBuffer));
      const decodedLicenseRequest = window.atob(requestBufferStr); // Decode from base64
      const licenseRequestBytes = Uint8Array.from(decodedLicenseRequest, (l) => l.charCodeAt(0));

      // Get license from server
      const res = await getLicenseFromServer(server, licenseRequestBytes.buffer, requestFilter, responseFilter);

      // Write response to remote player
      console.log("remotePlayer", "license-request", "Writing response to remote player", res.code);
      event.writeLicenseResponse(res.code, res.responseBody);
    });
  }
}

async function getLicenseFromServer(drmServer, licenseRequest, drmRequestFilter, drmResponseFilter) {
  console.log("remotePlayer", "license-request", "Requesting license From Widevine server");
  const request = {
    "uris": [drmServer],
    "method": "POST",
    "body": licenseRequest,
    "headers": {
      "Content-Type": "application/octet-stream"
    }
  };

  if (drmRequestFilter) {
    drmRequestFilter(request);
  }

  let response = await fetch(request.uris[0], request);

  response = {
    data: await response.arrayBuffer(),
    headers: response.headers,
    originalUri: response.url,
    status: response.status,
    timeMs: -1,
    uri: response.url
  };

  if (drmResponseFilter) {
    drmResponseFilter(response);
  }

  const code = response.status;
  if (code !== 200) {
    const responseBody = response.data ? String.fromCharCode(new Uint8Array(response.data)) : undefined;
    console.error("remotePlayer", "license-request", "failed to to get response from widevine:", code, responseBody);
    return { code, responseBody };
  }

  return { code, responseBody: response.data };
}
