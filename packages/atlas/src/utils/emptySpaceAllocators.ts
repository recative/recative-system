import type { SpaceRect } from './rectStructs';

export class DefaultEmptySpaces implements StaticEmptySpaces {
  public countSpaces: number = 0;

  public emptySpaces: SpaceRect[] = [];

  public remove(i: number) {
    this.emptySpaces[i] = this.emptySpaces[this.emptySpaces.length - 1];
    this.emptySpaces.pop();
  }

  public add(r: SpaceRect) {
    this.emptySpaces.push(r);
    return true;
  }

  public getCount() {
    return this.emptySpaces.length;
  }

  public reset() {
    this.emptySpaces = [];
  }

  public get(i: number) {
    return this.emptySpaces[i];
  }
}

export class StaticEmptySpaces {
  public countSpaces: number = 0;

  public emptySpaces: SpaceRect[];

  constructor(maxSpaces: number) {
    this.emptySpaces = new Array<SpaceRect>(maxSpaces);
  }

  public remove(i: number) {
    this.emptySpaces[i] = this.emptySpaces[this.countSpaces - 1];
    this.countSpaces -= 1;
  }

  public add(r: SpaceRect) {
    if (this.countSpaces < this.emptySpaces.length) {
      this.emptySpaces[this.countSpaces] = r;
      this.countSpaces += 1;

      return true;
    }

    return false;
  }

  public getCount() {
    return this.countSpaces;
  }

  public reset() {
    this.countSpaces = 0;
  }

  public get(i: number) {
    return this.emptySpaces[i];
  }
}
