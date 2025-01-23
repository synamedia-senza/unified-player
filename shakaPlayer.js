import { remotePlayer, lifecycle } from "senza-sdk";
import shaka from "shaka-player";
/**
 * ShakaPlayer subclass of Shaka that handles both local and remote playback.
 *
 * @class ShakaPlayer
 *
 * @example
 * import { ShakaPlayer } from "./shakaPlayer.js";
 *
 * try {
 *   const videoElement = document.getElementById("video");
 *   const player = new ShakaPlayer(videoElement);
 *   await player.load("http://playable.url/file.mpd");
 *   await videoElement.play(); // will start the playback
 *
 * } catch (err) {
 *   console.error("ShakaPlayer failed with error", err);
 * }
 */
export class ShakaPlayer extends shaka.Player {
  /**
   * Creates an instance of ShakaPlayer, which is a subclass of shaka.Player.
   *
   * @param {HTMLVideoElement} videoElement - The video element to be used for local playback.
   */
  constructor(videoElement, videoContainer, dependencyInjector) {
    super(videoElement, videoContainer, dependencyInjector);
    this.remotePlayer = remotePlayer;
    this.addPlayerEventListeners();

    if (videoElement) {
      this.videoElement = videoElement;
      this.remotePlayer.attach(this.videoElement);
      this.addMediaEventListeners();
    }
  }

  async attach(videoElement, initializeMediaSource) {
    super.attach(videoElement, initializeMediaSource);
    if (this.videoElement !== undefined) removeMediaEventListeners();
    this.videoElement = videoElement;
    this.remotePlayer.attach(this.videoElement);
    this.addMediaEventListeners();
  }

  addPlayerEventListeners() {
    this.remotePlayer.addEventListener("ended", () => {
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
      this.videoElement.currentTime = this.remotePlayer.currentTime;
    });

    this.addEventListener("error", (event) => {
      console.log("localPlayer error:", event.detail.errorCode, event.detail.message);
    });
  }

  addMediaEventListeners() {
    this.videoElement.addEventListener("play", this.remotePlayer.play);
    this.videoElement.addEventListener("pause", this.remotePlayer.pause);
    this.videoElement.addEventListener("seeked", this.updateCurrentTime);
  }
  
  removeMediaEventListeners() {
    this.videoElement.removeEventListener("play", this.remotePlayer.play);
    this.videoElement.removeEventListener("pause", this.remotePlayer.pause);
    this.videoElement.removeEventListener("seeked", this.updateCurrentTime);
  }
  
  updateCurrentTime() {
    this.remotePlayer.currentTime = this.videoElement.currentTime;
  }

  /**
   * Helper function that makes it easier to check if lifecycle.state is
   * either background or inTransitionToBackground.
   */
  get isInRemotePlayback() {
    return lifecycle.state === lifecycle.UiState.BACKGROUND || lifecycle.state === lifecycle.UiState.IN_TRANSITION_TO_BACKGROUND;
  }

  /**
   * Loads a media URL into both local and remote players.
   *
   * @param {string} url - The URL of the media to load.
   * @returns {Promise<void>}
   */
  async load(url, startTime, mimeType) {
    if (!this.isInRemotePlayback || remotePlayer.getAssetUri() !== url) {
      try {
        await this.remotePlayer.load(url);
      } catch (error) {
        console.log("Couldn't load remote player. Error:", error);
      }
    }
    try {
      await super.load(url, startTime, mimeType);
    } catch (error) {
      console.log("Couldn't load local player. Error:", error);
    }
  }

  setTextTrackVisibility(isVisible) {
    super.setTextTrackVisibility(isVisible);
    remotePlayer.setTextTrackVisibility(isVisible);
  }

  selectAudioLanguage(language, role, channelsCount, safeMargin, codec, spatialAudio) {
    console.log("set audio:", language);
    super.selectAudioLanguage(language, role, channelsCount, safeMargin, codec, spatialAudio);
    
    let audioTracks = remotePlayer.getAudioTracks();
    if (audioTracks.length) {
      let track = audioTracks.find(t => t.lang == language);
      if (track) {
        console.log("set remote audio:", track.id);
        remotePlayer.selectAudioTrack(track.id);
      }
    }
  }

  selectTextLanguage(language, role, forced) {
    console.log("set text:", language);
    super.selectTextLanguage(language, role, forced);
    remotePlayer.selectTextTrack(language);
  }

  /**
   * Configures DRM settings.
   *
   * @param {string} server - The DRM server URL.
   * @param {(request: { body : ArrayBuffer | ArrayBufferView | null , headers : { [ key: string ]: string } , uris : string [] }) => void | null} requestFilter - Optional request filter function, allows you to add auth tokens and/or reformat the body.
   * @param {(response: { data : ArrayBuffer | ArrayBufferView , headers : { [ key: string ]: string } , originalUri : string , status ? : number , timeMs ? : number , uri : string }) => void | null} responseFilter - Optional response filter function.
   *
   * @example
   * shakaPlayer.configureDrm("https://proxy.uat.widevine.com/proxy", (request) => {
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
