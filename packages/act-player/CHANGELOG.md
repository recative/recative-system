# @recative/act-player

## 0.5.18

### Patch Changes

- 4c56c57: fix: Better video error log
- Updated dependencies [0b36c02]
  - @recative/core-manager@0.13.0

## 0.5.17

### Patch Changes

- 2432b63: feat: Log video element error
- ac22b56: feat: Implement a debugger which can be activated by keyboard codes
- Updated dependencies [bb0e92c]
  - @recative/core-manager@0.12.2

## 0.5.16

### Patch Changes

- Updated dependencies [46019d0]
  - @recative/core-manager@0.12.0

## 0.5.15

### Patch Changes

- 625867a: fix: ActPoint destroy do not finish
- a4cfcaf: fix: ActPoint initialized should be ref instead of state
- Updated dependencies [3eb1643]
  - @recative/core-manager@0.11.9

## 0.5.14

### Patch Changes

- 7a602af: fix: Act point hangs

## 0.5.13

### Patch Changes

- 5073159: fix(act-player): Race condition on Safari

## 0.5.12

### Patch Changes

- d42ea97: feat: Add life cycle related function to the protocol
- Updated dependencies [d42ea97]
  - @recative/act-protocol@0.2.11
  - @recative/core-manager@0.11.6

## 0.5.11

### Patch Changes

- 56bb94e: fix: Video sync should use timestamp of progress
- Updated dependencies [07dc4e0]
  - @recative/act-protocol@0.2.10

## 0.5.10

### Patch Changes

- 5d560ae: fix: Use an alternate way to detect broken video element
- Updated dependencies [79e1738]
- Updated dependencies [dbbd9e2]
  - @recative/core-manager@0.11.5

## 0.5.9

### Patch Changes

- 4ce5fb0: fix: Rollback the broken optimization

## 0.5.8

### Patch Changes

- 834fa9e: fix: Reduce false positive in broken video element detection for Safari

## 0.5.7

### Patch Changes

- feb76e9: fix: Incorrect asset data field
- Updated dependencies [feb76e9]
  - @recative/definitions@0.5.4

## 0.5.6

### Patch Changes

- fix: `extensionConfiguration` is undefined

## 0.5.5

### Patch Changes

- cc4afe9: feat: Supports extension configurations for assets
- 84db3a1: feat: Pause the act point while gotoEpisode triggered
- Updated dependencies [cc4afe9]
  - @recative/definitions@0.5.3

## 0.5.4

### Patch Changes

- 0bb62a7: fix: Video report progress immediately after pause and play
- 4ec4c11: fix: Log multiple video stuck reasons
- 42d78c1: fix: Video should be internal not ready right after video element load
- 7662e86: fix: Video report ready after first unstuck
- 6ba2e72: fix: Attempt to recover from iOS 16 broken video element
- Updated dependencies [d0ab403]
- Updated dependencies [e95d8bb]
  - @recative/core-manager@0.11.4

## 0.5.3

### Patch Changes

- Updated dependencies [68448ee]
- Updated dependencies [94ada38]
- Updated dependencies [c0142d7]
- Updated dependencies [cffb93b]
  - @recative/core-manager@0.11.0
  - @recative/definitions@0.5.0
  - @recative/act-protocol@0.2.9

## 0.5.2

### Patch Changes

- 7243ff3: fix: Video do not load on Firefox

## 0.5.1

### Patch Changes

- Updated dependencies [fc982ac]
  - @recative/core-manager@0.10.0

## 0.5.0

### Minor Changes

- b252f5f: feat: Implement dynamic resolution for full-screen act-point

### Patch Changes

- Updated dependencies [f1c3093]
- Updated dependencies [9fdeb4b]
  - @recative/core-manager@0.9.0

## 0.4.2

### Patch Changes

- Updated dependencies [148013b]
- Updated dependencies [7b07837]
  - @recative/act-protocol@0.2.8
  - @recative/core-manager@0.8.0

## 0.4.1

### Patch Changes

- Updated dependencies [25eecc8]
  - @recative/core-manager@0.7.0

## 0.4.0

### Minor Changes

- 15109d5: feat: Add optional phonograph audio backend for audio track of video

### Patch Changes

- Updated dependencies [c1bca16]
- Updated dependencies [2439a78]
- Updated dependencies [33d4903]
- Updated dependencies [2a2aa9c]
- Updated dependencies [15109d5]
  - @recative/core-manager@0.6.0

## 0.3.2

### Patch Changes

- feat: Postprocess function will also return resource metadata now

## 0.3.1

### Patch Changes

- bd1c6f8: fix: Query parameter not passed into act point correctly

## 0.3.0

### Minor Changes

- 775f617: BREAKING: Implemented series core manager, this will change the way to initialize the system
- a98f797: BREAKING: Handle legacy episode ID properly

### Patch Changes

- Updated dependencies [ceb427b]
- Updated dependencies [bda3138]
- Updated dependencies [775f617]
- Updated dependencies [a98f797]
  - @recative/core-manager@0.5.0
  - @recative/definitions@0.4.2

## 0.3.0-beta.0

### Minor Changes

- 775f617: BREAKING: Implemented series core manager, this will change the way to initialize the system

### Patch Changes

- Updated dependencies [775f617]
  - @recative/core-manager@0.5.0-beta.0

## 0.2.0

### Minor Changes

- 141ccfb: BREAKING: LoadingLayer, Error, PanicLayer, Stage will use design token of baseui instead of pure black color

## 0.1.4

### Patch Changes

- c1c3f5d: feat: Force video load after set source

## 0.1.3

### Patch Changes

- a6d0d58: feat: Improve compatibility via setting mimeType of video
- 9056efd: feat: Inject search parameter of host page into container

## 0.1.2

### Patch Changes

- e413c8d: fix: Ignore unexpected visibilitychange event

## 0.1.1

### Patch Changes

- Updated dependencies
  - @recative/definitions@0.4.0
  - @recative/act-protocol@0.2.7
  - @recative/core-manager@0.4.5

## 0.1.0

### Minor Changes

- refactor: Turn detailed episode data into episode data

### Patch Changes

- Updated dependencies
  - @recative/core-manager@0.4.0
  - @recative/definitions@0.3.0
  - @recative/act-protocol@0.2.6

## 0.0.4

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @recative/core-manager@0.3.0

## 0.0.3

### Patch Changes

- feat: Implement `trustedUploaders` to improve performance
- Updated dependencies
  - @recative/core-manager@0.2.4

## 0.0.2

### Patch Changes

- fix: Typing problem for nesting packages
- Updated dependencies
- Updated dependencies
  - @recative/core-manager@0.2.3
  - @recative/act-protocol@0.2.1

## 0.0.1

### Patch Changes

- fix: Inconsistent react version caused rendering problem

## 0.0.0

### Minor Changes

- Initial public version

### Patch Changes

- Updated dependencies
  - @recative/act-protocol@0.2.0
  - @recative/core-manager@0.2.0
  - @recative/definitions@0.2.0
  - @recative/smart-resource@0.2.0
