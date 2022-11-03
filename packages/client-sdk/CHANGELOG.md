# Changelog

## 11.0.1

### Patch Changes

- Updated dependencies [f5a4267]
- Updated dependencies [685ef92]
- Updated dependencies [509e568]
  - @recative/core-manager@0.11.1
  - @recative/smart-resource@0.2.1

## 11.0.0

### Patch Changes

- Updated dependencies [68448ee]
- Updated dependencies [94ada38]
- Updated dependencies [c0142d7]
- Updated dependencies [cffb93b]
  - @recative/core-manager@0.11.0
  - @recative/definitions@0.5.0
  - @recative/act-player@0.5.3
  - @recative/act-protocol@0.2.9

## 10.0.1

### Patch Changes

- Updated dependencies [7243ff3]
  - @recative/act-player@0.5.2

## 10.0.0

### Minor Changes

- fc982ac: feat: Subscribe to destroy state and hide the whole player instance to prevent time-sequence issue

### Patch Changes

- Updated dependencies [fc982ac]
  - @recative/core-manager@0.10.0
  - @recative/act-player@0.5.1

## 9.0.0

### Minor Changes

- b252f5f: feat: Implement dynamic resolution for full-screen act-point
- 7cc61a1: feat: Use online database to resolve GPU performance information

### Patch Changes

- 1c27eb0: fix(client-sdk): Episode initialize error
- Updated dependencies [f1c3093]
- Updated dependencies [b252f5f]
- Updated dependencies [9fdeb4b]
  - @recative/core-manager@0.9.0
  - @recative/act-player@0.5.0

## 8.0.0

### Patch Changes

- db4ecee: chore: Export useEpisodeIdNormalizer
- Updated dependencies [148013b]
- Updated dependencies [7b07837]
  - @recative/act-protocol@0.2.8
  - @recative/core-manager@0.8.0
  - @recative/act-player@0.4.2

## 7.0.0

### Patch Changes

- 2e6adbd: feat: Add `normalizeEpisodeId` to injected functions
- Updated dependencies [25eecc8]
  - @recative/core-manager@0.7.0
  - @recative/act-player@0.4.1

## 6.0.0

### Patch Changes

- 24bc81c: chore: Format episode id while calling getEpisodeMetadata
- Updated dependencies [c1bca16]
- Updated dependencies [2439a78]
- Updated dependencies [33d4903]
- Updated dependencies [2a2aa9c]
- Updated dependencies [15109d5]
- Updated dependencies [9ced044]
  - @recative/core-manager@0.6.0
  - @recative/act-player@0.4.0
  - @recative/open-promise@0.2.3

## 5.3.6

### Patch Changes

- Updated dependencies [9ac9d7f]
  - @recative/core-manager@0.5.7

## 5.3.5

### Patch Changes

- 8a7895e: chore: Normalize episode id while executing the `gotoEpisode` function
- 8a7895e: feat: Better debugging experience
- Updated dependencies [f920c38]
  - @recative/open-promise@0.2.2

## 5.3.4

### Patch Changes

- Updated dependencies [3ea3282]
  - @recative/ugly-json@0.0.1

## 5.3.3

### Patch Changes

- 013f7f0: fix: Episode id not resolve correctly

## 5.3.2

### Patch Changes

- c98d4cb: chore: Better episodeID detection method

## 5.3.1

### Patch Changes

- c08112a: fix: Episode id normalizer not working correctly
- Updated dependencies [c1cadd8]
  - @recative/definitions@0.4.3

## 5.3.0

### Minor Changes

- 601b807: feat: Pass search parameter of host page into envVariable

## 5.2.5

### Patch Changes

- Updated dependencies [f90f645]
  - @recative/core-manager@0.5.6

## 5.2.4

### Patch Changes

- 830326e: feat: Add normalize function to `useEpisodeDetail` hook

## 5.2.3

### Patch Changes

- fix: Incorrectly injected envVariable

## 5.2.2

### Patch Changes

- Updated dependencies
  - @recative/act-player@0.3.2

## 5.2.1

### Patch Changes

- 772ae46: chore: Inject more episode related details into envVariable
- Updated dependencies [bd1c6f8]
  - @recative/act-player@0.3.1

## 5.2.0

### Minor Changes

- feat: Throw an error if data not loaded

## 5.1.0

### Minor Changes

- 0fd36c8: BREAKING: Episide ID will be injected to interfaceComponents now

### Patch Changes

- cf335a6: fix: Default user implemented functions not injected
- Updated dependencies [f44fa99]
- Updated dependencies [f1e3e64]
  - @recative/core-manager@0.5.3
  - @recative/open-promise@0.2.1

## 5.0.6

### Patch Changes

- feat(client-sdk): Also inject uploaders

## 5.0.5

### Patch Changes

- a5eab32: chore: Inject more functions into interfaceComponents
- abc1022: fix: Uploader configuration not injected

## 5.0.4

### Patch Changes

- feat: Export dataFetcher hook

## 5.0.3

### Patch Changes

- Updated dependencies [3199138]
  - @recative/core-manager@0.5.2

## 5.0.2

### Patch Changes

- Updated dependencies [60e8678]
  - @recative/core-manager@0.5.1

## 5.0.1

### Patch Changes

- 338a3b9: fix: User Implemented Functions not available while initializing

## 5.0.0

### Minor Changes

- ceb427b: BREAKING: Change the return type of getEpisodeMetadata, which allows interface developers can update episode data
- 775f617: BREAKING: Implemented series core manager, this will change the way to initialize the system
- a98f797: BREAKING: Handle legacy episode ID properly

### Patch Changes

- Updated dependencies [ceb427b]
- Updated dependencies [bda3138]
- Updated dependencies [775f617]
- Updated dependencies [a98f797]
  - @recative/core-manager@0.5.0
  - @recative/definitions@0.4.2
  - @recative/act-player@0.3.0

## 5.0.0-beta.0

### Minor Changes

- 775f617: BREAKING: Implemented series core manager, this will change the way to initialize the system

### Patch Changes

- Updated dependencies [775f617]
  - @recative/act-player@0.3.0-beta.0
  - @recative/core-manager@0.5.0-beta.0

## 4.0.0

### Patch Changes

- Updated dependencies [141ccfb]
  - @recative/act-player@0.2.0

## 3.4.1

### Patch Changes

- cfe9cd2: fix: Incorrect debug container component url
- Updated dependencies [a6d0d58]
- Updated dependencies [9056efd]
  - @recative/act-player@0.1.3

## 3.4.0

### Minor Changes

- BREAKING: Refactor the rule to build data url

## 3.3.0

### Minor Changes

- BREAKING: Change interfaceComponents loading rule

## 3.2.4

### Patch Changes

- Updated dependencies
  - @recative/definitions@0.4.0
  - @recative/act-player@0.1.1
  - @recative/act-protocol@0.2.7
  - @recative/core-manager@0.4.5

## 3.2.3

### Patch Changes

- fix: Dependency map

## 3.2.1

### Patch Changes

- fix: Data connection for client-sdk

## 3.2.0

### Minor Changes

- feat: Supports `uson` data format

## 3.1.0

### Minor Changes

- refactor: Shrink data to build smaller bundle

## 3.0.0

### Minor Changes

- refactor: Turn detailed episode data into episode data

### Patch Changes

- Updated dependencies
  - @recative/act-player@0.1.0
  - @recative/core-manager@0.4.0
  - @recative/definitions@0.3.0
  - @recative/act-protocol@0.2.6

## 2.0.0

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @recative/core-manager@0.3.0
  - @recative/act-player@0.0.4

## 1.0.3

### Patch Changes

- feat: Implement `trustedUploaders` to improve performance
- Updated dependencies
  - @recative/act-player@0.0.3
  - @recative/core-manager@0.2.4

## 1.0.2

### Patch Changes

- fix: Typing problem for nesting packages
- Updated dependencies
- Updated dependencies
  - @recative/act-player@0.0.2
  - @recative/core-manager@0.2.3
  - @recative/act-protocol@0.2.1

## 1.0.1

### Patch Changes

- fix: Inconsistent react version caused rendering problem
- Updated dependencies
  - @recative/act-player@0.0.1

## 1.0.0

### Minor Changes

- Initial public version

### Patch Changes

- Updated dependencies
  - @recative/act-player@0.0.0
  - @recative/act-protocol@0.2.0
  - @recative/core-manager@0.2.0
  - @recative/definitions@0.2.0
  - @recative/open-promise@0.2.0
  - @recative/smart-resource@0.2.0

This file was generated using [@jscutlery/semver](https://github.com/jscutlery/semver).

## 0.1.0 (2022-08-04)

### Features

- Configure deploy tool ([9bb27cb](https://github.com/recative/recative-system/commit/9bb27cb7512d097b7d4e385876db3e90a8da24ec))
