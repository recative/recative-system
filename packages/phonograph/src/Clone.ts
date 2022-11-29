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

  set canplaythrough(_) {
    // eslint-disable-line no-unused-vars
    // noop
  }

  get loaded() {
    return this.original.loaded;
  }

  set loaded(_) {
    // eslint-disable-line no-unused-vars
    // noop
  }

  get _chunks() {
    return this.original._chunks;
  }

  set _chunks(_) {
    // eslint-disable-line no-unused-vars
    // noop
  }
}
