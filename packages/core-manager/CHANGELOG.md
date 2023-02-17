# Changelog

## 0.12.3

### Patch Changes

- 20a40d3: chore: Adjust the way of reading device type

## 0.12.2

### Patch Changes

- bb0e92c: feat(core-manager): Add client type to device manager

## 0.12.1

### Patch Changes

- 8969ae5: feat: Add debugging information for NoMoreURLAvailableError
- 76afb49: fix: Suppress content instance finish when switching content

## 0.12.0

### Minor Changes

- 46019d0: feat: Detect broken audio context and reset audio

### Patch Changes

- Updated dependencies [46019d0]
  - @recative/audio-station@0.4.0
  - @recative/phonograph@2.2.0

## 0.11.9

### Patch Changes

- 3eb1643: feat: More log in SeriesCore

## 0.11.8

### Patch Changes

- d22a0be: fix: Playback hangs

## 0.11.7

### Patch Changes

- 6a1b64e: fix: undefined is not an object

## 0.11.6

### Patch Changes

- d42ea97: feat: Add life cycle related function to the protocol
- Updated dependencies [d42ea97]
  - @recative/act-protocol@0.2.11

## 0.11.5

### Patch Changes

- 79e1738: fix: Don't update audioElement time if it is not playing when pause
- dbbd9e2: feat: Log url when audio track is loaded

## 0.11.4

### Patch Changes

- d0ab403: fix: Audio track discard buffer when url is the same
- e95d8bb: fix: More relax audio/video sync

## 0.11.3

### Patch Changes

- bbc22e4: fix: Incorrect default language

## 0.11.2

### Patch Changes

- 3fbfcf2: fix: AudioTrack time rewind
- 0ee108e: fix: AudioTrack time should force update after AudioElement load
- Updated dependencies [52ccfd1]
  - @recative/definitions@0.5.1

## 0.11.1

### Patch Changes

- f5a4267: feat: Seek after pause if pause is too late
- 509e568: feat: Destroy unused preloaded content
- Updated dependencies [685ef92]
  - @recative/smart-resource@0.2.1

## 0.11.0

### Minor Changes

- 94ada38: feat: Support ManagerCoreStateTrigger in IAssetForClient
- cffb93b: fix: Incorrect showingContentCount

### Patch Changes

- 68448ee: fix: Stuck when audio track is set to null
- Updated dependencies [94ada38]
- Updated dependencies [c0142d7]
  - @recative/definitions@0.5.0
  - @recative/act-protocol@0.2.9
  - @recative/resource-loader@0.2.3

## 0.10.0

### Minor Changes

- fc982ac: feat: Subscribe to destroy state and hide the whole player instance to prevent time-sequence issue

## 0.9.0

### Minor Changes

- f1c3093: feat: Don't wait for audio ready before autoplay

### Patch Changes

- 9fdeb4b: fix: Pause new content explicitly when switching
- Updated dependencies [be5bc59]
  - @recative/time-schedule@0.2.1

## 0.8.0

### Minor Changes

- 7b07837: BREAKING: The way to specify audio backend was changed

### Patch Changes

- Updated dependencies [148013b]
  - @recative/act-protocol@0.2.8

## 0.7.0

### Minor Changes

- 25eecc8: feat: SeriesCore Lifecycle override and control

## 0.6.0

### Minor Changes

- 2439a78: feat: Allow AudioHost to use phonograph audio backend
- 15109d5: feat: Add optional phonograph audio backend for audio track of video

### Patch Changes

- c1bca16: fix: generator hangs when no resource available
- 33d4903: feat: Provide more detailed information to task queue
- 2a2aa9c: fix: Incorrect task queue dependency configuration
- Updated dependencies [15109d5]
- Updated dependencies [acbb9bf]
- Updated dependencies [15109d5]
- Updated dependencies [9ced044]
  - @recative/phonograph@2.0.0
  - @recative/audio-station@0.3.0
  - @recative/open-promise@0.2.3

## 0.5.7

### Patch Changes

- 9ac9d7f: fix: Incorrect task queue dependency relationship

## 0.5.6

### Patch Changes

- f90f645: fix: Resource redirection not working correctly

## 0.5.3

### Patch Changes

- f44fa99: fix: Query `userImplementedFunctions` after core destroyed will trigger an error
- Updated dependencies [f1e3e64]
  - @recative/open-promise@0.2.1

## 0.5.2

### Patch Changes

- 3199138: fix: Init EpisodeCore fields before set as current

## 0.5.1

### Patch Changes

- 60e8678: fix: Incorrect initialize order

## 0.5.0

### Minor Changes

- ceb427b: BREAKING: Change the return type of getEpisodeMetadata, which allows interface developers can update episode data
- 775f617: BREAKING: Implemented series core manager, this will change the way to initialize the system
- a98f797: BREAKING: Handle legacy episode ID properly

### Patch Changes

- Updated dependencies [bda3138]
  - @recative/definitions@0.4.2

## 0.5.0-beta.0

### Minor Changes

- 775f617: BREAKING: Implemented series core manager, this will change the way to initialize the system

## 0.4.5

### Patch Changes

- Updated dependencies
  - @recative/definitions@0.4.0
  - @recative/act-protocol@0.2.7
  - @recative/resource-loader@0.2.2

## 0.4.4

### Patch Changes

- chore: Update configuration of slowTaskQueue

## 0.4.3

### Patch Changes

- 58754b7: fix: Incorrect env override order

## 0.4.2

### Patch Changes

- d8cfc20: fix: Order of atoms in env manager

## 0.4.1

### Patch Changes

- fix: Don't ready again when destroy sequence

## 0.4.0

### Minor Changes

- refactor: Turn detailed episode data into episode data

### Patch Changes

- Updated dependencies
  - @recative/definitions@0.3.0
  - @recative/act-protocol@0.2.6
  - @recative/resource-loader@0.2.1

## 0.3.0

### Minor Changes

- feat: Supports redirect reason description
- feat: Supports redirect reason description

## 0.2.4

### Patch Changes

- feat: Implement `trustedUploaders` to improve performance

## 0.2.3

### Patch Changes

- fix: Typing problem for nesting packages
- Updated dependencies
  - @recative/act-protocol@0.2.1

## 0.2.2

### Patch Changes

- fix(core): Resource preload caused app crash

## 0.2.1

### Patch Changes

- fix: language reset when localstorage update

## 0.2.0

### Minor Changes

- Initial public version

### Patch Changes

- Updated dependencies
  - @recative/act-protocol@0.2.0
  - @recative/audio-station@0.2.0
  - @recative/definitions@0.2.0
  - @recative/open-promise@0.2.0
  - @recative/resource-loader@0.2.0
  - @recative/smart-resource@0.2.0
  - @recative/time-schedule@0.2.0

This file was generated using [@jscutlery/semver](https://github.com/jscutlery/semver).

## 0.1.0 (2022-08-04)

### Features

- Configure deploy tool ([9bb27cb](https://github.com/recative/recative-system/commit/9bb27cb7512d097b7d4e385876db3e90a8da24ec))

### Bug Fixes

- Language issue ([279c7ad](https://github.com/recative/recative-system/commit/279c7adc6312a2c54fc6df27d3ab30b9df527a74))
- Performance issue while querying resources ([a595e6d](https://github.com/recative/recative-system/commit/a595e6d16cff41f7a49fc1e48b8c064c7a41d741))
- URL query performance improvement ([17abad0](https://github.com/recative/recative-system/commit/17abad0a1ee3ef875db133aabc821e956458c78e))
