import { makeUniversalApp } from '@electron/universal';
import path from 'path';
// @ts-ignore
import { productName } from '../package.json';

makeUniversalApp({
  x64AppPath: path.resolve(
    process.cwd(),
    `out/${productName}-darwin-x64/${productName}.app`
  ),
  arm64AppPath: path.resolve(
    process.cwd(),
    `out/${productName}-darwin-arm64/${productName}.app`
  ),
  outAppPath: path.resolve(
    process.cwd(),
    `out/${productName}-darwin-universal/${productName}.app`
  ),
  force: true,
});
