import { remotePlayer, lifecycle } from "senza-sdk";
import { sdkLogger } from "senza-sdk";
import shaka from "shaka-player";
/**
 * SenzaShakaPlayer subclass of Shaka that handles both local and remote playback.
 *
 * @class SenzaShakaPlayer
 *
 * @example
 * import { SenzaShakaPlayer } from "./senzaShakaPlayer.js";
 *
 * try {
 *   const videoElement = document.getElementById("video");
 *   const player = new SenzaShakaPlayer(videoElement);
 *   await player.load("http://playable.url/file.mpd");
 *   await videoElement.play(); // will start the playback
 *
 * } catch (err) {
 *   console.error("SenzaShakaPlayer failed with error", err);
 * }
 */
export class SenzaShakaPlayer extends shaka.Player {

    /**
     * @private
     * @type {Object.<string, Function>}
     * @description Object containing event listeners for the video element.
     */
    _videoEventListeners = {
        "play": () => {
            this.remotePlayer.play();
        },
        "pause": () => {
            this.remotePlayer.pause();
        },
        "seeked": () => {
            this.remotePlayer.currentTime = this.videoElement.currentTime;
        }
    };

    /**
     * @private
     * @type {Object.<string, Function>}
     * @description Object containing event listeners for the remote player.
     */
    _remotePlayerEventListeners = {
        "ended": () => {
            sdkLogger.log("remotePlayer ended");
            lifecycle.moveToForeground();
            if (this.videoElement) {
                this.videoElement.dispatchEvent(new Event("ended"));
            }
        },
        "error": (event) => {
            sdkLogger.log("remotePlayer error:", event.detail.errorCode, event.detail.message);
            if (this.videoElement) {
                this.videoElement.dispatchEvent(new CustomEvent("error", event));
            }
        },
        "license-request": async (event) => {
            sdkLogger.log("remotePlayer", "license-request", "Got license-request event from remote player");

            // Extract license body from event
            const requestBuffer = event?.detail?.licenseRequest;
            const requestBufferStr = String.fromCharCode.apply(null, new Uint8Array(requestBuffer));
            const decodedLicenseRequest = window.atob(requestBufferStr); // Decode from base64
            const licenseRequestBytes = Uint8Array.from(decodedLicenseRequest, (l) => l.charCodeAt(0));

            const request = {
                body: licenseRequestBytes.buffer,
                uris: [this.getConfiguration().drm.servers["com.widevine.alpha"]], // TODO: safe gaurd against undefined and other server types
                method: "POST"
            };

            const response = await this.getNetworkingEngine().request(shaka.net.NetworkingEngine.RequestType.LICENSE, request).promise;

            let responseBody = response.data;
            if (response.status !== 200) {
                responseBody = response.data ?? String.fromCharCode(new Uint8Array(response.data));
                sdkLogger.error("remotePlayer", "license-request", "failed to to get response from widevine:", response.status, responseBody);
            }
            // Write response to remote player
            sdkLogger.log("remotePlayer", "license-request", "Writing response to remote player", response.status);
            event.writeLicenseResponse(response.status, responseBody);

        }
    };

    /**
     * Creates an instance of SenzaShakaPlayer, which is a subclass of shaka.Player.
     *
     * @param {HTMLVideoElement} videoElement - The video element to be used for local playback. This parameter is optional. If not provided, the video element can be attached later using the attach method.
     * @param {HTMLElement=} videoContainer - The videoContainer to construct UITextDisplayer
     * @param {function(shaka.Player)=} dependencyInjector Optional callback
   *   which is called to inject mocks into the Player.  Used for testing.
     */
    constructor(videoElement, videoContainer, dependencyInjector) {
        super(videoElement, videoContainer, dependencyInjector);
        this.remotePlayer = remotePlayer;
        this.addRemotePlayerEventListeners();
        // if video element is provided, add the listeres here. In this case ,there is no need to call attach.
        if (videoElement) {
            this.videoElement = videoElement;
            this.addVideoElementEventListeners();
            sdkLogger.warn("SenzaShakaPlayer constructor Adding videoElement in the constructor is going to be deprecated in the future. Please use attach method instead.");
        }
    }

    /**
     * Overrides the attach method of shaka.Player to attach the video element.
     *
     * @param {HTMLVideoElement} videoElement - The video element to be used for local playback.
     * @param {boolean} [initializeMediaSource=true] - Whether to initialize the media source.
     */
    async attach(videoElement, initializeMediaSource = true) {
        await super.attach(videoElement, initializeMediaSource);
        this.videoElement = videoElement;
        this.remotePlayer.attach(this.videoElement);
        this.addVideoElementEventListeners();

    }

    /**
   * Detach the player from the current media element. Leaves the player in a
   * state where it cannot play media, until it has been attached to something
   * else.
   *
   * @param {boolean=} keepAdManager
   *
   * @return {!Promise}
   * @export
   */
    async detach(keepAdManager = false) {
        await super.detach(keepAdManager);
        this.removeVideoElementEventListeners();
        if (remotePlayer.getAssetUri() !== "") {
            await this.remotePlayer.unload();
        }
        this.remotePlayer.detach();
        this.videoElement = null;
    }

    addRemotePlayerEventListeners() {
        for (const [event, listener] of Object.entries(this._remotePlayerEventListeners)) {
            this.remotePlayer.addEventListener(event, listener);
        }
    }

    addVideoElementEventListeners() {
        for (const [event, listener] of Object.entries(this._videoEventListeners)) {
            this.videoElement.addEventListener(event, listener);
        }

    }

    removeVideoElementEventListeners() {
        for (const [event, listener] of Object.entries(this._videoEventListeners)) {
            this.videoElement.removeEventListener(event, listener);
        }
    }

    removeRemotePlayerEventListeners() {
        for (const [event, listener] of Object.entries(this._remotePlayerEventListeners)) {
            this.remotePlayer.removeEventListener(event, listener);
        }
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
                sdkLogger.log("Couldn't load remote player. Error:", error);
            }
        }
        try {
            await super.load(url, startTime, mimeType);
        } catch (error) {
            sdkLogger.log("Couldn't load local player. Error:", error);
        }
    }

    destroy() {
        this.removeRemotePlayerEventListeners();
        return super.destroy();
    }

}
