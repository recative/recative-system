import fs from 'fs';
import JsonStreamStringify from 'json-stream-stringify';
import path from 'path';

import type { Logger } from './types';

export interface PointMetaData {
  episode: string;
  point: string;
  path: string;
}

export const getProjectMetadata = (logError: Logger = console.error) => {
  const root = process.cwd();
  const show = process.env.SHOW_INDEX !== 'false';
  const filter = process.env.EPISODE_FILTER;
  // const index = path.resolve(root, show ? 'src/dev/index.tsx' : 'src/dev/placeholder.tsx');
  const index = path.resolve(
    root,
    show
      ? require.resolve('@recative/ap-preview/src/web.tsx')
      : require.resolve('@recative/ap-pack/src/empty.ts'),
  );
  const episodesPath = path.resolve(root, 'src/episodes');
  if (!fs.existsSync(episodesPath)) {
    throw Error(`The folder for the episodes, ${episodesPath} does not exist`);
  }
  const episodes = fs.readdirSync(episodesPath);
  const episodeMetadata = new Map<string, PointMetaData>();
  episodes.forEach((episode) => {
    if (episode === '.DS_Store') {
      return;
    }
    if (filter !== undefined) {
      if (!new RegExp(filter).test(episode)) {
        return;
      }
    }
    const episodePath = path.join(episodesPath, episode);
    const points = fs.readdirSync(episodePath);
    points.forEach((pointName) => {
      const point = pointName.toUpperCase();
      const entryName = episode + point;
      const entryPath = path.join(
        episodePath,
        pointName.toLowerCase(),
        'index.ts',
      );
      if (!fs.existsSync(entryPath)) {
        logError(
          '\x1b[33m%s\x1b[0m',
          `Can not find entry file: ${entryPath} for episode ${episode}, part ${pointName}.`,
        );
      } else {
        episodeMetadata.set(entryName, {
          episode,
          point,
          path: entryPath,
        });
      }
    });
  });
  return { index: filter === undefined ? index : undefined, episodeMetadata };
};

export const dumpLargeJSON = (json: unknown, filePath: string) => {
  const jsonStream = new JsonStreamStringify(json, undefined, '\t');
  const fileStream = fs.createWriteStream(filePath, { encoding: 'utf-8' });
  jsonStream.pipe(fileStream);
  return new Promise((res, rej) => {
    jsonStream.on('error', rej);
    fileStream.on('error', rej);
    fileStream.on('finish', res);
  });
};
