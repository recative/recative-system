/* eslint-disable no-console */
import { ResourceLoader } from '../src';

const resourceStone = ResourceLoader.getInstance();

console.log(resourceStone);

resourceStone.addResource({
  id: 'aaaaaaa',
  url: 'https://dummyimage.com/600x400/000/fff',
});

const promise = resourceStone.getResource('aaaaaaa');

console.log(promise);

promise.then((blob) => console.log(blob.size));
