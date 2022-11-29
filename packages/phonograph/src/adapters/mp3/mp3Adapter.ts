import type { IAdapter } from '../IAdapter';
import getFrameLength from './getFrameLength';
import parseFrameHeader from './parseHeader';
import parseMetadata from './parseMetadata';

import { Metadata } from './types';
import { validateHeader } from './validateHeader';
import wrapChunk from './wrapChunk';

export const mp3Adapter: IAdapter<Metadata> = {
  validateChunk: validateHeader,
  getChunkLength: (rawData, metadata, index) => {
    if (metadata === null) {
      return null;
    }
    return getFrameLength(rawData, index ?? 0, metadata);
  },
  getChunkDuration: (_, metadata) => {
    if (metadata === null) {
      return null;
    }
    return 1152 / metadata.sampleRate;
  },
  getChunkMetadata: (rawData, index) => {
    const rawMetadata = parseFrameHeader(rawData, index);

    if (!rawMetadata) return null;

    return parseMetadata(rawMetadata);
  },
  wrapChunk: (rawData) => {
    return wrapChunk(rawData);
  }
};
