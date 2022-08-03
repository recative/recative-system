import { ISimpleRelease } from '../meta/release';

export interface ISimpleSearchableRelease extends ISimpleRelease {
  type: 'media' | 'code';
}
