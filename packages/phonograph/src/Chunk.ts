import { AudioContext, IAudioBuffer } from 'standardized-audio-context';

import { slice } from './utils/buffer';
import { IAdapter } from './adapters/IAdapter';

import Clip from './Clip';


export default class Chunk<Metadata> {
  clip: Clip<Metadata>;
  context: AudioContext;
  duration: number | null = null;
  numFrames: number | null = null;
  raw: Uint8Array;
  extended: Uint8Array | null;
  extendedWithHeader: Uint8Array | null;;
  ready: boolean;
  next: Chunk<Metadata> | null = null;
  readonly adapter: IAdapter<Metadata>;

  private _attached: boolean;
  private _firstByte: number;
  private callbacks: Record<string, Array<(data?: any) => void>> = {};

  constructor({
    clip,
    raw,
    onready,
    onerror,
    adapter,
  }: {
    clip: Clip<Metadata>;
    raw: Uint8Array;
    onready: (() => void) | null;
    onerror: (error: Error) => void;
    adapter: IAdapter<Metadata>;
  }) {
    this.clip = clip;
    this.context = clip.context;

    this.raw = raw;
    this.extended = null;
    this.extendedWithHeader = null;

    this.adapter = adapter;

    this.duration = null;
    this.ready = false;

    this._attached = false;
    if (onready !== null) {
      this.once('ready', onready);
    }
    this.once('error', onerror);

    this._firstByte = 0;

    const decode = (callback: () => void, errback: (err: Error) => void) => {
      const buffer = slice(raw, this._firstByte, raw.length);
      const bufferWithId3Header = this.adapter.wrapChunk(buffer).buffer

      this.context.decodeAudioData(bufferWithId3Header, callback, (err) => {
        if (err) {
          return errback(err)
        };

        this._firstByte += 1;

        // filthy hack taken from http://stackoverflow.com/questions/10365335/decodeaudiodata-returning-a-null-error
        // Thanks Safari developers, you absolute numpties
        for (; this._firstByte < raw.length - 1; this._firstByte += 1) {
          if (this.adapter.validateChunk(raw, this._firstByte)) {
            return decode(callback, errback);
          }
        }

        errback(new Error(`Could not decode audio buffer`));
      });
    };

    decode(
      () => {
        let numFrames = 0;
        let duration = 0;
        let i = this._firstByte;

        while (i < this.raw.length) {
          if (this.adapter.validateChunk(this.raw, i)) {
            const metadata = this.adapter.getChunkMetadata(this.raw, i);
            numFrames += 1;

            const frameLength = this.adapter.getChunkLength(
              this.raw,
              metadata,
              i
            );
            i += Math.max(frameLength ?? 0, 4);
            duration +=
              this.adapter.getChunkDuration(this.raw, metadata, i) ?? 0;
          } else {
            i += 1;
          }
        }

        this.duration = duration;
        this.numFrames = numFrames;
        this._ready();
      },
      () => {
        this._fire('error', new Error(`Could not decode audio buffer`));
      }
    );
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

  private _fire(eventName: string, data?: any) {
    const callbacks = this.callbacks[eventName];
    if (!callbacks) return;

    callbacks.slice().forEach((cb) => cb(data));
  }

  attach(nextChunk: Chunk<Metadata> | null) {
    this.next = nextChunk;
    this._attached = true;

    this._ready();
  }

  createBufferCallback(
    callback: (buffer: IAudioBuffer) => void,
    errback: (error: Error) => void
  ) {
    this.createBuffer().then(callback, errback);
  }

  createBuffer(): Promise<IAudioBuffer> {
    if (!this.ready) {
      throw new Error(
        'Something went wrong! Chunk was not ready in time for playback'
      );
    }
    return this.context.decodeAudioData(
      slice(this.extendedWithHeader!, 0, this.extendedWithHeader!.length).buffer
    );
  }

  private _ready() {
    if (this.ready) return;

    if (this._attached && this.duration !== null) {
      this.ready = true;

      if (this.next) {
        const rawLen = this.raw.length;
        const nextLen = this.next.raw.length >> 1; // we don't need the whole thing

        this.extended = new Uint8Array(rawLen + nextLen);

        let p = 0;

        for (let i = this._firstByte; i < rawLen; i += 1) {
          this.extended[p++] = this.raw[i];
        }

        for (let i = 0; i < nextLen; i += 1) {
          this.extended[p++] = this.next.raw[i];
        }
      } else {
        this.extended =
          this._firstByte > 0
            ? slice(this.raw, this._firstByte, this.raw.length)
            : this.raw;
      }
      this.extendedWithHeader = this.adapter.wrapChunk(this.extended)

      this._fire('ready');
    }
  }
}
