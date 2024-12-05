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
 *   await player.getMediaElement().play(); // Will start the playback on the local player
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

    this.addOverrides(videoElement);
    this.addEventListeners();
  }

 /**
  * Replaces the implementation of methods on the video element including play and pause
  * with a new function that calls the original as well as the equivalent methods on the
  * remote player.
  */
  addOverrides(videoElement) {
    // override play()
    const localPlayerPlay = videoElement.play.bind(videoElement);
    videoElement.play = async () => {
      await localPlayerPlay();
      await this.remotePlayer.play();
    };

    // override pause()
    const localPlayerPause = videoElement.pause.bind(videoElement);
    videoElement.pause = async () => {
      if (this.isInRemotePlayback) {
        console.warn("Pausing while in remote playback is not supported yet.");
      } else {
        await localPlayerPause();
        await this.remotePlayer.pause();
      }
    };

    // override currentTime
    videoElement.getCurrentTime = () => videoElement.__proto__.__lookupGetter__('currentTime').call(videoElement);
    videoElement.setCurrentTime = (value) => videoElement.__proto__.__lookupSetter__('currentTime').call(videoElement, value);
    Object.defineProperty(videoElement, 'currentTime', {
      get: () => {
        return this.isInRemotePlayback ? this.remotePlayer.currentTime : videoElement.getCurrentTime();
      },
      set: (time) => {
        if (this.isInRemotePlayback) {
          console.warn("Setting currentTime while in remote playback is not supported yet.");
        } else {
          console.log('Set currentTime:', time);
          videoElement.setCurrentTime(time);
          this.remotePlayer.currentTime = time;
        }
      },
      configurable: true,
      enumerable: true,
    });
  }

  addEventListeners() {
    this.remotePlayer.addEventListener("ended", () => {
      console.log("remotePlayer ended");
      lifecycle.moveToForeground();
      this.videoElement.dispatchEvent(new Event("ended"));
    });

    this.remotePlayer.addEventListener("error", (event) => {
      console.log("remotePlayer error:", event.detail.errorCode, event.detail.message);
      this.videoElement.dispatchEvent(new CustomEvent("error", event));
    });

    this.remotePlayer.addEventListener("timeupdate", () => {
      if (!this.isInRemotePlayback) {
        return;
      }
      this.videoElement.setCurrentTime(this.remotePlayer.currentTime);
      // not necessary to dispatch a new event, since setting the current time will do so anyway
      // this.videoElement.dispatchEvent(new Event("timeupdate"));
    });

    this.addEventListener("error", (event) => {
      console.log("localPlayer error:", event.detail.errorCode, event.detail.message);
    });
    
    this.videoElement.addEventListener("timeupdate", () => {
      if (this.isInRemotePlayback) {
        return;
      }
      // added this back as it seems to work better with it. Let's discuss why it was removed.
      this.remotePlayer.currentTime = this.videoElement.getCurrentTime();
      this.dispatchEvent(new Event("timeupdate"));
    });
  }

  /**
   * Should we move this to lifecycle?
   */
  get isInRemotePlayback() {
    return lifecycle.state === lifecycle.UiState.BACKGROUND || lifecycle.state === lifecycle.UiState.IN_TRANSITION_TO_BACKGROUND;
  }

  /**
   * DEPRECATED: use the property on the media element. Remote player only supports 1x.
   */
  get playbackRate() {
    if (this.isInRemotePlayback) {
      console.warn("playbackRate in remote playback is not supported yet.");
      return this.remotePlayer.playbackRate === undefined ? 1 : this.remotePlayer.playbackRate;
    } else {
      return this.videoElement.playbackRate;
    }
  }

  /**
   * DEPRECATED: use the property on the media element. Remote player only supports 1x.
   */
  set playbackRate(rate) {
    if (this.isInRemotePlayback) {
      console.warn("playbackRate in remote playback is not supported yet.");
    }
    this.remotePlayer.playbackRate = this.videoElement.playbackRate = rate;
  }

  /**
   * Indicates whether the player is paused.
   * DEPRECATED: use the property on the media element, no need to override it.
   *
   * @readonly
   * @type {boolean}
   */
  get paused() {
    return this.isInRemotePlayback ? false : this.videoElement.paused;
  }

  /**
   * Gets the current playback time.
   * DEPRECATED: use the overridden property on the media element.
   *
   * @type {number}
   */
  get currentTime() {
    this.videoElement.currentTime;
  }

  /**
   * Sets the current playback time.
   * NOTE: When in remote playback, this will not affect the remote player.
   * DEPRECATED: use the overridden property on the media element.
   * @param {number} time - The time to set the current playback to.
   */
  set currentTime(time) {
    this.videoElement.currentTime = time;
  }

  /**
   * Loads a media URL into both local and remote players.
   *
   * @param {string} url - The URL of the media to load.
   * @returns {Promise<void>}
   */
  async load(url) {
    if (!this.isInRemotePlayback || remotePlayer.getAssetUri() !== url) {
      try {
        await this.remotePlayer.load(url);
      } catch (error) {
        console.log("Couldn't load remote player. Error:", error);
      }
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
   * Switches between play and pause.
   */
  async playPause() {
    if (this.videoElement.paused) {
      await this.videoElement.play();
    } else {
      await this.videoElement.pause();
    }
  }

  /**
   * Adjusts the current time of the player by a given number of seconds.
   * Moves forward if the number is positive, or backwards if it is negative.
   */
  skip(seconds) {
    this.videoElement.currentTime = this.videoElement.currentTime + seconds;
  }

  /**
   * Plays the media.
   * Will start the playback on the local player.
   * To move the playback to the remote player, call {@link moveToRemotePlayback}.
   * DEPRECATED: use the overridden method on the media element.
   *
   * @returns {Promise<void>}
   */
  async play() {
    await this.videoElement.play();
  }

  /**
   * Pauses the media on both local and remote players.
   * NOTE: When in remote playback, this will not have any affect.
   * DEPRECATED: use the overridden method on the media element.
   */
  async pause() {
    await this.videoElement.pause();
  }

  /**
   * Moves playback to local player.
   *
   * @returns {Promise<void>}
   */
  async moveToLocalPlayback() {
    await this.videoElement.play(); // why is this needed?
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
