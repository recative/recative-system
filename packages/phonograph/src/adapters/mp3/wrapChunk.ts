const id3Header = new Uint8Array([0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])

export default function wrapChunk(
  original: Uint8Array
): Uint8Array {
  if (original.length >= 3) {
    if (original[0] === 0x49 && original[1] === 0x44 && original[2] === 0x33) {
      // already has ID3 header
      return original
    }
  }
  const result = new Uint8Array(id3Header.length + original.length)
  for (let i = 0; i < id3Header.length; i++) {
    result[i] = id3Header[i]
  }
  for (let i = 0; i < original.length; i++) {
    result[i + id3Header.length] = original[i]
  }
  return result
}
