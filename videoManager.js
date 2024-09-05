import { UnifiedPlayer } from "./unifiedPlayer.js";

class VideoManager {

  init(videoElement, drmServer) {
    this.player = new UnifiedPlayer(videoElement);
    if (drmServer) {
      // this will allow you to manipulate the request to the drm server including addind authorization headers and changing the body format
      this.player.configureDrm(drmServer, (request) => {
        request.headers["Authorization"] = "Bearer <...>"
      });
    }
  }

  async load(url) {
    try {
      await this.player.load(url);
    } catch (error) {
      console.log("Couldn't load.");
    }
  }

  play() {
    this.player.play().catch(error => {
      console.error("Unable to play video. Possibly the browser will not autoplay video with sound. Error:", error);
    });
  }

  pause() {
    this.player.pause();
  }

  playPause() {
    if (this.player.paused) {
      this.play();
    } else {
      this.pause();
    }
  }

  skip(seconds) {
    this.player.currentTime = this.player.currentTime + seconds;
  }

  async toggleLocalAndRemotePlayback() {
    if (this.player.isInRemotePlayback) {
      this.player.moveToLocalPlayback();
    } else {
      this.player.moveToRemotePlayback();
    }
  }
}

export const videoManager = new VideoManager();