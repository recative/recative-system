import {
  AudioContext,
  GainNode,
  IAudioBuffer,
  IAudioBufferSourceNode,
  IAudioNode,
  IGainNode,
} from 'standardized-audio-context';

import warn from './utils/warn';
import Chunk from './Chunk';
import Clone from './Clone';
import { slice } from './utils/buffer';
import { Loader, FetchLoader, XhrLoader } from './Loader';
import { IAdapter } from './adapters/IAdapter';

const CHUNK_SIZE = 64 * 1024;
const OVERLAP = 0.2;

class PhonographError extends Error {
  phonographCode: string;
  url: string;

  constructor(message: string, opts: { phonographCode: string; url: string }) {
    super(message);

    this.phonographCode = opts.phonographCode;
    this.url = opts.url;
  }
}

// A cache of audio buffers starting from current time
interface AudioBufferCache<Metadata> {
  currentChunkStartTime: number;
  currentChunk: Chunk<Metadata> | null;
  currentBuffer: IAudioBuffer | null;
  nextBuffer: IAudioBuffer | null;
  pendingBuffer: IAudioBuffer | null;
}

export default class Clip<Metadata> {
  url: string;
  loop: boolean;
  readonly adapter: IAdapter<Metadata>;

  private callbacks: Record<string, Array<(data?: any) => void>> = {};
  context: AudioContext;

  buffered = 0;
  length = 0;
  private _loaded = false;
  public get loaded() {
    return this._loaded;
  }
  public set loaded(value) {
    this._loaded = value;
  }
  private _canplaythrough = false;
  public get canplaythrough() {
    return this._canplaythrough;
  }
  public set canplaythrough(value) {
    this._canplaythrough = value;
  }
  loader: Loader;
  metadata: Metadata | null = null;
  playing = false;
  ended = false;

  private _startTime: number = 0;
  private _currentTime = 0;
  private __chunks: Chunk<Metadata>[] = [];
  public get _chunks(): Chunk<Metadata>[] {
    return this.__chunks;
  }
  public set _chunks(value: Chunk<Metadata>[]) {
    this.__chunks = value;
  }
  private _contextTimeAtStart: number = 0;
  private _pendingSourceStart: number = 0;
  private _connected: boolean = false;
  private fadeTarget: number;
  private _gain: GainNode<AudioContext>;
  private _loadStarted: boolean = false;
  private _actualPlaying = false;
  public get stuck() {
    return this.playing && !this._actualPlaying;
  }
  private _currentSource: IAudioBufferSourceNode<AudioContext> | null = null;
  private _nextSource: IAudioBufferSourceNode<AudioContext> | null = null;
  private _currentGain: IGainNode<AudioContext> | null = null;
  private _nextGain: IGainNode<AudioContext> | null = null;
  private _audioBufferCache: AudioBufferCache<Metadata> | null = null;

  constructor({
    context,
    url,
    loop,
    volume,
    adapter,
  }: {
    context?: AudioContext;
    url: string;
    loop?: boolean;
    volume?: number;
    adapter: IAdapter<Metadata>;
  }) {
    this.context = context || new AudioContext();
    this.url = url;
    this.loop = loop || false;
    this.adapter = adapter;

    this.loader = new ((window as any).fetch ? FetchLoader : XhrLoader)(url);

    this.fadeTarget = volume || 1;
    this._gain = this.context.createGain();
    this._gain.gain.value = this.fadeTarget;

    this._gain.connect(this.context.destination);

    this._chunks = [];
  }

  buffer(bufferToCompletion = false) {
    if (!this._loadStarted) {
      this._loadStarted = true;

      let tempBuffer = new Uint8Array(CHUNK_SIZE * 2);
      let p = 0;
      let processedBytes = 0;
      let nextFrameStartBytes = 0;

      let loadStartTime = Date.now();
      let totalLoadedBytes = 0;

      const checkCanplaythrough = () => {
        if (this.canplaythrough || !this.length) return;

        let duration = 0;
        let bytes = 0;

        for (let chunk of this._chunks) {
          if (!chunk.duration) break;
          duration += chunk.duration;
          bytes += chunk.raw.length;
        }

        if (!duration) return;

        const scale = this.length / bytes;
        const estimatedDuration = duration * scale;

        const timeNow = Date.now();
        const elapsed = timeNow - loadStartTime;

        const bitrate = totalLoadedBytes / elapsed;
        const estimatedTimeToDownload =
          (1.5 * (this.length - totalLoadedBytes)) / bitrate / 1e3;

        // if we have enough audio that we can start playing now
        // and finish downloading before we run out, we've
        // reached canplaythrough
        const availableAudio = (bytes / this.length) * estimatedDuration;

        if (availableAudio > estimatedTimeToDownload) {
          this.canplaythrough = true;
          this._fire('canplaythrough');
        }
      };

      const drainBuffer = () => {
        const isFirstChunk = this._chunks.length === 0;
        const firstByte = isFirstChunk ? 32 : 0;

        const chunk = new Chunk<Metadata>({
          clip: this,
          raw: slice(tempBuffer, firstByte, p),
          onready: () => {
            if (!this.canplaythrough) {
              checkCanplaythrough();
            }
            this.trySetupAudioBufferCache();
          },
          onerror: (error: any) => {
            error.url = this.url;
            error.phonographCode = 'COULD_NOT_DECODE';
            this._fire('loaderror', error);
          },
          adapter: this.adapter,
        });

        const lastChunk = this._chunks[this._chunks.length - 1];
        if (lastChunk) lastChunk.attach(chunk);

        this._chunks.push(chunk);
        processedBytes += p;
        p = 0;

        return chunk;
      };

      this.loader.load({
        onprogress: (progress: number, length: number, total: number) => {
          this.buffered = length;
          this.length = total;
          this._fire('loadprogress', { progress, length, total });
        },

        ondata: (uint8Array: Uint8Array) => {
          if (!this.metadata) {
            for (let i = 0; i < uint8Array.length; i += 1) {
              // determine some facts about this mp3 file from the initial header
              if (this.adapter.validateChunk(uint8Array)) {
                const metadata = this.adapter.getChunkMetadata(uint8Array);
                this.metadata = metadata;

                break;
              }
            }
          }

          for (let i = 0; i < uint8Array.length; i += 1) {
            // once the buffer is large enough, wait for
            // the next frame header then drain it
            // TODO: header detection may not works if the header is divided into two data segments.
            if (
              p + processedBytes >= nextFrameStartBytes &&
              this.adapter.validateChunk(uint8Array, i)
            ) {
              const metadata = this.adapter.getChunkMetadata(uint8Array, i);
              nextFrameStartBytes =
                p +
                processedBytes +
                (this.adapter.getChunkLength(uint8Array, metadata, i) ?? 0);
              if (p > CHUNK_SIZE + 4) {
                drainBuffer();
              }
            }

            // write new data to buffer
            tempBuffer[p++] = uint8Array[i];
          }

          totalLoadedBytes += uint8Array.length;
        },

        onload: () => {
          if (p) {
            const lastChunk = drainBuffer();
            lastChunk.attach(null);

            totalLoadedBytes += p;
          }

          const actualLoad = () => {
            if (!this.canplaythrough) {
              this.canplaythrough = true;
              this._fire('canplaythrough');
            }

            this.loaded = true;
            this._fire('load');
          };
          if (this._chunks[0].ready) {
            actualLoad();
          } else {
            this._chunks[0].once('ready', actualLoad);
          }
        },

        onerror: (error: any) => {
          error.url = this.url;
          error.phonographCode = 'COULD_NOT_LOAD';
          this._fire('loaderror', error);
          this._loadStarted = false;
        },
      });
    }

    return new Promise<void>((fulfil, reject) => {
      const ready = bufferToCompletion ? this.loaded : this.canplaythrough;

      if (ready) {
        fulfil();
      } else {
        this.once(bufferToCompletion ? 'load' : 'canplaythrough', () => {
          fulfil();
        });
        this.once('loaderror', reject);
        this.once('dispose', reject);
      }
    });
  }

  clone() {
    return new Clone<Metadata>(this);
  }

  connect(
    destination: IAudioNode<AudioContext>,
    output?: number,
    input?: number
  ) {
    if (!this._connected) {
      this._gain.disconnect();
      this._connected = true;
    }

    this._gain.connect(destination, output, input);
    return this;
  }

  disconnect(
    destination: IAudioNode<AudioContext>,
    output?: number,
    input?: number
  ) {
    this._gain.disconnect(destination, output, input);
  }

  dispose() {
    if (this.playing) this.pause();

    if (this._loadStarted) {
      this.loader.cancel();
      this._loadStarted = false;
    }

    this._currentTime = 0;
    this.loaded = false;
    this.canplaythrough = false;
    this._chunks = [];

    this._fire('dispose');
  }

  off(eventName: string, cb: (data?: any) => void) {
    const callbacks = this.callbacks[eventName];
    if (!callbacks) return;

    const index = callbacks.indexOf(cb);
    if (~index) callbacks.splice(index, 1);
  }

  on(eventName: string, cb: (data?: any) => void) {
    const callbacks =
      this.callbacks[eventName] || (this.callbacks[eventName] = []);
    callbacks.push(cb);

    return {
      cancel: () => this.off(eventName, cb),
    };
  }

  once(eventName: string, cb: (data?: any) => void) {
    const _cb = (data?: any) => {
      cb(data);
      this.off(eventName, _cb);
    };

    return this.on(eventName, _cb);
  }

  play() {
    const promise = new Promise((fulfil, reject) => {
      this.once('ended', fulfil);

      this.once('loaderror', reject);
      this.once('playbackerror', reject);

      this.once('dispose', () => {
        if (this.ended) return;

        const err = new PhonographError('Clip was disposed', {
          phonographCode: 'CLIP_WAS_DISPOSED',
          url: this.url,
        });
        reject(err);
      });
    });

    if (this.playing) {
      warn(
        `clip.play() was called on a clip that was already playing (${this.url})`
      );
    } else if (!this.canplaythrough) {
      warn(
        `clip.play() was called before clip.canplaythrough === true (${this.url})`
      );
      this.buffer();
    }
    this.playing = true;
    this.ended = false;
    this.tryResumePlayback();

    return promise;
  }

  pause() {
    if (!this.playing) {
      warn(
        `clip.pause() was called on a clip that was already paused (${this.url})`
      );
      return this;
    }

    this.resetAudioNodes();
    this.stopFade();
    this.playing = false;
    this._actualPlaying = false;
    this._fire('pause');

    return this;
  }

  get currentTime() {
    if (this.playing && this._actualPlaying) {
      return (
        this._startTime + (this.context.currentTime - this._contextTimeAtStart)
      );
    } else {
      return this._currentTime;
    }
  }

  set currentTime(currentTime) {
    if (this.playing) {
      this.pause();
      this._currentTime = currentTime;
      this._audioBufferCache = null;
      this.trySetupAudioBufferCache();
      this.play().catch(() => {});
    } else {
      this._currentTime = currentTime;
      this._audioBufferCache = null;
      this.trySetupAudioBufferCache();
    }
  }

  get duration() {
    let total = 0;
    for (let chunk of this._chunks) {
      if (!chunk.duration) return null;
      total += chunk.duration;
    }

    return total;
  }

  get paused() {
    return !this.playing;
  }

  get volume() {
    return this._gain.gain.value;
  }

  set volume(volume) {
    this.stopFade();
    this._gain.gain.value = this.fadeTarget = volume;
  }

  fade(startVolume: number, endVolume: number, duration: number) {
    this.stopFade();
    if (!this.playing) {
      this.volume = endVolume;
      return;
    }
    const now = this.context.currentTime;
    this._gain.gain.value = startVolume;
    this._gain.gain.linearRampToValueAtTime(endVolume, now + duration);
    this.fadeTarget = endVolume;
  }

  private stopFade() {
    const now = this.context.currentTime;
    this._gain!.gain.cancelScheduledValues(now);
    this._gain!.gain.value = this.fadeTarget;
  }

  private _fire(eventName: string, data?: any) {
    const callbacks = this.callbacks[eventName];
    if (!callbacks) return;

    callbacks.slice().forEach((cb) => cb(data));
  }

  // Attempt to setup AudioBufferCache if it is not setup
  // Should be called when new chunk is ready
  private trySetupAudioBufferCache() {
    if (this._audioBufferCache !== null) {
      return;
    }
    let lastChunk: Chunk<Metadata> | null = null;
    let chunk: Chunk<Metadata> | null = this._chunks[0] ?? null;
    let time = 0;
    while (chunk !== null) {
      if (chunk.duration === null) {
        return;
      }
      const chunkEnd = time + chunk.duration;
      if (chunkEnd > this._currentTime) {
        // TODO: reuse audio buffer in old cache
        this._audioBufferCache = {
          currentChunkStartTime: time,
          currentChunk: chunk,
          currentBuffer: null,
          nextBuffer: null,
          pendingBuffer: null,
        };
        this.decodeChunk(chunk ?? null);
        this.decodeChunk(chunk?.next ?? null);
        this.decodeChunk(chunk?.next?.next ?? null);
        return;
      }
      time = chunkEnd;
      lastChunk = chunk;
      chunk = lastChunk.next;
    }
    // All available Chunk visited, check if there are more chunks to be load.
    if (lastChunk?.ready) {
      this._audioBufferCache = {
        currentChunkStartTime: time,
        currentChunk: null,
        currentBuffer: null,
        nextBuffer: null,
        pendingBuffer: null,
      };
    }
  }

  // Check is there enough audio buffer to schedule current and next chunk
  private audioBufferCacheHit() {
    const audioBufferCache = this._audioBufferCache;
    if (audioBufferCache === null) {
      return false;
    }
    const { currentChunk, currentBuffer, nextBuffer } = audioBufferCache;
    if (currentChunk === null) {
      return true;
    }
    if (!currentChunk.ready) {
      return false;
    }
    if (currentBuffer === null) {
      return false;
    }
    const nextChunk = currentChunk.next;
    if (nextChunk === null) {
      return true;
    }
    if (!nextChunk.ready) {
      return false;
    }
    if (nextBuffer === null) {
      return false;
    }
    return true;
  }

  // Advance the audioBufferCache to next chunk when current chunk is played
  private advanceAudioBufferCache() {
    const { currentChunk, currentChunkStartTime, nextBuffer, pendingBuffer } =
      this._audioBufferCache!;
    this._audioBufferCache = {
      currentChunkStartTime: currentChunkStartTime + currentChunk!.duration!,
      currentChunk: currentChunk!.next!,
      currentBuffer: nextBuffer,
      nextBuffer: pendingBuffer,
      pendingBuffer: null,
    };
    this.decodeChunk(currentChunk?.next?.next?.next ?? null);
  }

  // Start play the audioBuffer when the audioBufferCacheHit is true
  private startPlay() {
    this._startTime = this._currentTime;
    this._actualPlaying = true;
    const { currentChunkStartTime, currentChunk, currentBuffer, nextBuffer } =
      this._audioBufferCache!;

    this._contextTimeAtStart = this.context.currentTime;
    if (currentChunk !== null) {
      this._pendingSourceStart =
        this._contextTimeAtStart +
        (currentChunk.duration! - (this._startTime - currentChunkStartTime));

      this._currentSource = this.context.createBufferSource();
      this._currentSource.buffer = currentBuffer!;
      this._currentGain = this.context.createGain();
      this._currentGain.connect(this._gain);
      this._currentGain.gain.setValueAtTime(
        0,
        this._pendingSourceStart + OVERLAP
      );
      this._currentSource.connect(this._currentGain);
      this._currentSource.start(
        this._contextTimeAtStart,
        this._startTime - currentChunkStartTime
      );
      this._currentSource.stop(this._pendingSourceStart + OVERLAP * 2);
      this._currentSource.addEventListener('ended', this.onCurrentSourceEnd);
      if (currentChunk.next !== null) {
        const pendingStart =
          this._pendingSourceStart + currentChunk.next!.duration!;
        this._nextSource = this.context.createBufferSource();
        this._nextSource.buffer = nextBuffer!;
        this._nextGain = this.context.createGain();
        this._nextGain.connect(this._gain);
        this._nextGain.gain.setValueAtTime(0, this._pendingSourceStart);
        this._nextGain.gain.setValueAtTime(
          1,
          this._pendingSourceStart + OVERLAP
        );
        this._nextSource.connect(this._nextGain);
        this._nextSource.start(this._pendingSourceStart);
        this._nextGain.gain.setValueAtTime(0, pendingStart + OVERLAP);
        this._nextSource.stop(pendingStart + OVERLAP * 2);
        this._pendingSourceStart = pendingStart;
      }
    } else {
      this.pause().currentTime = 0;
      // TODO: schedule playing of first chunk instead of do this
      if (this.loop) {
        this.play();
      } else {
        this.ended = true;
        this._fire('ended');
      }
    }
  }

  // Advance audio nodes to next chunk when current chunk is played
  // and the audioBufferCacheHit is true
  // should be called after advanceAudioBufferCache
  private advanceAudioNodes() {
    this._currentSource?.stop();
    this._currentSource?.disconnect();
    this._currentGain?.disconnect();
    this._currentGain = this._nextGain;
    this._currentSource = this._nextSource;
    this._currentSource?.addEventListener('ended', this.onCurrentSourceEnd);
    const { currentChunk, nextBuffer } = this._audioBufferCache!;
    if ((currentChunk?.next ?? null) !== null) {
      const pendingStart =
        this._pendingSourceStart + currentChunk?.next!.duration!;
      this._nextSource = this.context.createBufferSource();
      this._nextSource.buffer = nextBuffer!;
      this._nextGain = this.context.createGain();
      this._nextGain.connect(this._gain);
      this._nextGain.gain.setValueAtTime(0, this._pendingSourceStart);
      this._nextGain.gain.setValueAtTime(1, this._pendingSourceStart + OVERLAP);
      this._nextSource.connect(this._nextGain);
      this._nextSource.start(this._pendingSourceStart);
      this._nextGain.gain.setValueAtTime(0, pendingStart + OVERLAP);
      this._nextSource.stop(pendingStart + OVERLAP * 2);
      this._pendingSourceStart = pendingStart;
    } else {
      this._nextGain = null;
      this._nextSource = null;
    }
    if (currentChunk === null) {
      this.pause().currentTime = 0;
      // TODO: schedule playing of first chunk instead of do this
      if (this.loop) {
        this.play();
      } else {
        this.ended = true;
        this._fire('ended');
      }
    }
  }

  // Reset audioNodes when stuck or paused
  private resetAudioNodes() {
    if (this._currentSource) {
      this._currentSource.stop();
      this._currentSource.disconnect();
      this._currentSource = null;
    }
    if (this._nextSource) {
      this._nextSource.stop();
      this._nextSource.disconnect();
      this._nextSource = null;
    }
    if (this._currentGain) {
      this._currentGain.disconnect();
      this._currentGain = null;
    }
    if (this._nextGain) {
      this._nextGain.disconnect();
      this._nextSource = null;
    }
    if (!this.playing || !this._actualPlaying) {
      return;
    }
    this._currentTime =
      this._startTime + (this.context.currentTime - this._contextTimeAtStart);
    this._audioBufferCache = null;
    this.trySetupAudioBufferCache();
  }

  // Advance to next Chunk if playback of current source ends
  private onCurrentSourceEnd = () => {
    if (!this.playing || !this._actualPlaying) {
      return;
    }
    this.advanceAudioBufferCache();
    if (this.audioBufferCacheHit()) {
      this.advanceAudioNodes();
    } else {
      this.resetAudioNodes();
      this._actualPlaying = false;
    }
  };

  // Put audio buffer into AudioBufferCache when it is decoded
  private onBufferDecoded(chunk: Chunk<Metadata>, buffer: IAudioBuffer) {
    const audioBufferCache = this._audioBufferCache;
    if (audioBufferCache === null) {
      return;
    }
    if (audioBufferCache.currentChunk === chunk) {
      if (audioBufferCache.currentBuffer === null) {
        audioBufferCache.currentBuffer = buffer;
      }
    }
    if (audioBufferCache.currentChunk?.next === chunk) {
      if (audioBufferCache.nextBuffer === null) {
        audioBufferCache.nextBuffer = buffer;
      }
    }
    if (audioBufferCache.currentChunk?.next?.next === chunk) {
      if (audioBufferCache.pendingBuffer === null) {
        audioBufferCache.pendingBuffer = buffer;
      }
    }
    this.tryResumePlayback();
  }

  // Start chunk decode
  private decodeChunk(chunk: Chunk<Metadata> | null) {
    if (chunk === null) {
      return;
    }
    if (chunk.ready) {
      chunk.createBuffer().then(
        (buffer) => {
          this.onBufferDecoded(chunk, buffer);
        },
        (err) => {
          this._fire('playbackerror', err);
        }
      );
    } else {
      chunk.once('ready', () => {
        chunk.createBuffer().then(
          (buffer) => {
            this.onBufferDecoded(chunk, buffer);
          },
          (err) => {
            this._fire('playbackerror', err);
          }
        );
      });
    }
  }

  // Attempt to resume playback when not actual Playing
  private tryResumePlayback() {
    if (this._actualPlaying || !this.playing) {
      return;
    }
    if (this._audioBufferCache === null) {
      return;
    }
    if (this.audioBufferCacheHit()) {
      this.startPlay();
    }
  }
}
