import { writeFileSync } from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';

import { resolve as withRoot } from 'app-root-path';

export const writeLog = async () => {
  const { stdout } = await promisify(exec)('git --no-pager log --pretty=format:"%h %s" --graph -n 10');
  writeFileSync(
    `${withRoot('dist/build.txt')}`,
    `=-=-=-=-=-=-=-=-=-=\r\nBUILD TIME\r\n=-=-=-=-=-=-=-=-=-=\r\nLast Build: ${new Date().toString()}\r\n\r\n=-=-=-=-=-=-=-=-=-=\r\nCOMMIT HISTORY\r\n=-=-=-=-=-=-=-=-=-=\r\n${stdout}`,
  );
};
