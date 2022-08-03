import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';

import { webpack } from 'webpack';
import { dumpLargeJSON } from './utils';
import { getConfig } from './config';

import type { Logger } from './types';

export const build = (
  logInfo: Logger = console.log,
  logError: Logger = console.error,
) => {
  const mode = process.env.NODE_ENV === 'development' ? 'development' : 'production';
  const config = getConfig(mode, false, logError);
  const compiler = webpack(config);

  compiler.run(async (err, stats) => {
    if (err) {
      logError(err);
      compiler.close(() => {
        process.exit(1);
      });
    }
    logInfo(
      stats?.toString({
        colors: true,
        errorDetails: true,
      }),
    );
    if (process.env.DEBUG_AP_PACK === 'true') {
      // webpack stats is large enough that we can not simply stringify it
      await dumpLargeJSON(stats?.toJson(), path.resolve(process.cwd(), 'webpack-stats.json'));
    }

    if (!stats) {
      throw new Error('No stats');
    }
    const statsData = stats.toJson();
    const assetList = statsData.assets!.map((asset) => ({
      name: asset.name,
      hash: crypto
        .createHash('md5')
        .update(fs.readFileSync(path.join(statsData.outputPath!, asset.name)))
        .digest('hex'),
    }));
    fs.writeJSONSync(
      path.join(statsData.outputPath!, 'assets.json'),
      assetList,
    );

    compiler.close(() => {
      process.exit();
    });
  });
};
