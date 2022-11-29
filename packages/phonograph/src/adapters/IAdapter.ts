export interface IAdapter<Metadata> {
  validateChunk: (rawData: Uint8Array, index?: number) => boolean;
  getChunkLength: (
    rawData: Uint8Array,
    metadata: Metadata | null,
    index?: number
  ) => number | null;
  getChunkDuration: (
    rawData: Uint8Array,
    metadata: Metadata | null,
    index?: number
  ) => number | null;
  getChunkMetadata: (rawData: Uint8Array, index?: number) => Metadata | null;
  wrapChunk: (rawData: Uint8Array) => Uint8Array
}
