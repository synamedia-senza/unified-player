# Unified player



The `UnifiedPlayer` class is designed to handle both local and remote video playback seamlessly. It abstracts the complexities of switching between local playback using Shaka Player and remote playback using the Senza device player.

## Properties

- **isInRemotePlayback**: `boolean` - Indicates whether the player is in remote playback mode.
- **currentTime**: `number` - Gets or sets the current playback time.
- **duration**: `number` - Gets the duration of the media.
- **paused**: `boolean` - Indicates whether the player is paused.

## Events

- **ended**: Indicates that the media has ended.
- **error**: Indicates that an error occurred.
- **timeupdate**: Indicates that the current playback time has changed.

## Methods

- **constructor(videoElement: HTMLVideoElement)**: Initializes the `UnifiedPlayer` with a given video element for local playback.
- **load(url: string): Promise<void>**: Loads a media URL into both local and remote players.
- **play(): Promise<void>**: Plays the media. Starts playback on the local player.
- **pause()**: Pauses the media on both local and remote players.
- **moveToLocalPlayback(): Promise<void>**: Moves playback to the local player.
- **moveToRemotePlayback()**: Moves playback to the remote player.


# VideoManager

The `VideoManager` class acts as a higher-level controller that manages the `UnifiedPlayer` instance. It provides a simplified interface for initializing the player, loading media, and controlling playback. The `VideoManager` class abstracts the details of interacting directly with the `UnifiedPlayer`, making it easier to integrate video playback functionality into an application.

## Key Responsibilities

- **Initialization**: Initializes the `UnifiedPlayer` with a given video element.
- **Loading Media**: Loads a media URL into the player.
- **Playback Control**: Provides methods to play, pause, and toggle playback.
- **Skipping**: Allows skipping forward or backward by a specified number of seconds.
- **Switching Playback Modes**: Toggles between local and remote playback modes.

## Methods

- **init(videoElement: HTMLVideoElement)**: Initializes the `UnifiedPlayer` with the provided video element.
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
