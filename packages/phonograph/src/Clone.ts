import Clip from './Clip';

export default class Clone<Metadata> extends Clip<Metadata> {
  original: Clip<Metadata>;

  constructor(original: Clip<Metadata>) {
    super({
      context: original.context,
      url: original.url,
      adapter: original.adapter,
    });
    this.original = original;
  }

  buffer() {
    return this.original.buffer();
  }

  clone() {
    return this.original.clone();
  }

  get canplaythrough() {
    return this.original.canplaythrough;
  }

  // eslint-disable-next-line class-methods-use-this
  set canplaythrough(_) {
    // eslint-disable-line no-unused-vars
    // noop
  }

  get loaded() {
    return this.original.loaded;
  }

  // eslint-disable-next-line class-methods-use-this
  set loaded(_) {
    // eslint-disable-line no-unused-vars
    // noop
  }

  get _chunks() {
    return this.original._chunks;
  }

  // eslint-disable-next-line class-methods-use-this
  set _chunks(_) {
    // eslint-disable-line no-unused-vars
    // noop
  }
}
