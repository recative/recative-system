import * as React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';

import { useEpisodes } from '@recative/client-sdk';

import { INDEX_ORDER } from './constants/storageKeys';

import { Player } from './player';

const indexEpisodeOrder = localStorage.getItem(INDEX_ORDER);

export const App = () => {
  const episodes = useEpisodes();

  const initialEpisode = React.useMemo(() => {
    return [...episodes.values()]
      .find(
        (episode) => (
          episode.order
          === (indexEpisodeOrder ? Number.parseInt(indexEpisodeOrder, 10) : 0)
        ),
      );
  }, [episodes]);

  if (!initialEpisode) return null;

  return (
    <Routes>
      <Route path="/episode/:episodeId" element={<Player />} />
      <Route
        path="/"
        element={<Navigate to={`/episode/${initialEpisode.id}`} />}
      />
    </Routes>
  );
};

export default App;
