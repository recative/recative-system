# @recative/ap-core

## 0.5.0

### Minor Changes

- dd76191: feat: SmartSprite won't update texture until texture is ready

### Patch Changes

- Updated dependencies [148013b]
  - @recative/act-protocol@0.2.8

## 0.4.2

### Patch Changes

- 297df61: fix: Emit textureupdate only when the texture is actual ready
- Updated dependencies [9ced044]
  - @recative/open-promise@0.2.3

## 0.4.1

### Patch Changes

- 7554f7f: fix: Recover old context after context.wrap

## 0.4.0

### Minor Changes

- e38a3a9: feat: Add useEnvVariableGetter

## 0.3.1

### Patch Changes

- db60c3b: fix: remove frameRateLevel when animation was paused
- Updated dependencies [bda3138]
  - @recative/definitions@0.4.2

## 0.3.1-beta.0

### Patch Changes

- db60c3b: fix: remove frameRateLevel when animation was paused

## 0.3.0

### Minor Changes

- BREAKING: Change default framerate level to ~30fps for all animations

## 0.2.3

### Patch Changes

- e7b5ff1: fix: Texture update timing

## 0.2.2

### Patch Changes

- 39dbb03: fix: Update texture scale

## 0.2.1

### Patch Changes

- chore: Update key of smart resource

## 0.2.0

### Minor Changes

- BREAKING: Change preload strategy

## 0.1.1

### Patch Changes

- Updated dependencies
  - @recative/definitions@0.4.0
  - @recative/act-protocol@0.2.7
  - @recative/resource-bridge@0.2.3

## 0.1.0

### Minor Changes

- f421a81: feat: Smart texture released property
- f0374bd: feat: Smart texture reference count
- bf9b809: feat: Smart texture auto release

### Patch Changes

- 731507f: fix: Various fix around smart texture release

## 0.0.6

### Patch Changes

- 76ce3ff: feat: Get mipmap back in smart textures

## 0.0.5

### Patch Changes

- feat: Disable mipmap to reduce memory usage

## 0.0.4

### Patch Changes

- chore: Better error log when texture url missing

## 0.0.3

### Patch Changes

- Updated dependencies
  - @recative/definitions@0.3.0
  - @recative/act-protocol@0.2.6
  - @recative/resource-bridge@0.2.2

## 0.0.2

### Patch Changes

- fix: Incorrect import path

## 0.0.1

### Patch Changes

- fix: Don't update texture when other env change
- fix: Restore animated sprite play state when load
- chore: Disable service worker by default since it caused atlas not working correctly
- chore: Performance improvement by batch RPC requests
- Updated dependencies
  - @recative/act-protocol@0.2.1

## 0.0.0

### Minor Changes

- Initial public version

### Patch Changes

- Updated dependencies
  - @recative/act-protocol@0.2.0
  - @recative/definitions@0.2.0
  - @recative/open-promise@0.2.0
  - @recative/resource-bridge@0.2.0
  - @recative/smart-resource@0.2.0
