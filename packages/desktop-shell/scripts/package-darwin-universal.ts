import { makeUniversalApp } from '@electron/universal';
import { productName } from '../package.json';

makeUniversalApp({
  x64AppPath: `out/${productName}-darwin-x64/${productName}.app`,
  arm64AppPath: `out/${productName}-darwin-arm64/${productName}.app`,
  outAppPath: `out/${productName}-darwin-universal/${productName}.app`,
  force: true,
});
