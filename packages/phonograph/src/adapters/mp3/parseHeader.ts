import { RawMetadata } from './types';

// http://www.mp3-tech.org/programmer/frame_header.html
// frame header starts with 'frame sync' – eleven 1s
export default function parseFrameHeader(
  data: Uint8Array,
  i = 0
): RawMetadata | false {
  return {
    mpegVersion: data[i + 1] & 0b00001000,
    mpegLayer: data[i + 1] & 0b00000110,
    sampleRate: data[i + 2] & 0b00001100,
    channelMode: data[i + 3] & 0b11000000,
  };
}
