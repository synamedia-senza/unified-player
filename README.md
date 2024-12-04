# Senza Shaka Player

The `SenzaShakaPlayer` is a subclass of the Shaka player that seamlessly handles playback of both local and remote video. It abstracts the complexities of switching between local playback using Shaka Player and remote playback using the Senza cloud connector.

## Properties

- **isInRemotePlayback**: `boolean` - Indicates whether the player is in remote playback mode.
- **currentTime**: `number` - Gets or sets the current playback time.
- **duration**: `number` - Gets the duration of the media.
- **paused**: `boolean` - Indicates whether the player is paused.
- **playbackRate**: `number` - Gets or sets the playback rate. **(currently only supported on local player)**

## Events

- **ended**: Indicates that the media has ended.
- **error**: Indicates that an error occurred.
- **timeupdate**: Indicates that the current playback time has changed.
- **canplay**: Indicates that the media is ready to play. **(currently only supported via local player)**
- **seeking**: Indicates that the player is seeking. **(currently only supported via local player)**
- **seeked**: Indicates that the player has finished seeking. **(currently only supported via local player)**
- **loadedmetadata**: Indicates that the player has loaded metadata. **(currently only supported via local player)**
- **waiting**: Indicates that the player is waiting for data. **(currently only supported via local player)**

## Methods

- **constructor(videoElement: HTMLVideoElement)**: Initializes the `UnifiedPlayer` with a given video element for local playback.
- **load(url: string): Promise<void>**: Loads a media URL into both local and remote players.
- **play(): Promise<void>**: Plays the media. Starts playback on the local player.
- **pause()**: Pauses the media on both local and remote players.
- **configureDrm(server: string, requestFilter?: Function, responseFilter?: Function)**: Configures DRM settings for the player.
- **moveToLocalPlayback(): Promise<void>**: Moves playback to the local player.
- **moveToRemotePlayback()**: Moves playback to the remote player.

## Key Responsibilities

- **Initialization**: Initializes the `UnifiedPlayer` with a given video element.
- **Loading Media**: Loads a media URL into the player.
- **Playback Control**: Provides methods to play, pause, and toggle playback.
- **Skipping**: Allows skipping forward or backward by a specified number of seconds.
- **Switching Playback Modes**: Toggles between local and remote playback modes.

## Methods

- **init(videoElement: HTMLVideoElement, drmServer?: String)**: Initializes the `UnifiedPlayer` with the provided video element and a drm server (optional).
- **load(url: string): Promise<void>**: Loads a media URL into the player.
- **play()**: Plays the media.
- **pause()**: Pauses the media.
- **playPause()**: Toggles between play and pause states.
- **skip(seconds: number)**: Skips forward or backward by the specified number of seconds.
- **toggleLocalAndRemotePlayback(): Promise<void>**: Toggles between local and remote playback modes.



See the [Playing Video](https://developer.synamedia.com/senza/docs/playing-video) tutorial in the Senza developer documentation.

## Build

```bash
npm ci
npx webpack -w --config webpack.config.js
open index.html
```
