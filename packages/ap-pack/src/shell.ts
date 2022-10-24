import { ManagedAp } from '@recative/ap-manager';

(() => {
  const manager = new ManagedAp();


})();

const ep = (new URLSearchParams(window.location.search)).get('ep');
const ap = (new URLSearchParams(window.location.search)).get('ap');

import(`src/episodes/${ep}/${ap}/index.ts`);