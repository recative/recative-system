import * as React from "react";
import { setupIonicReact } from "@ionic/react";

import { useEpisodes } from "@recative/client-sdk";

import { Routes, Route, Navigate } from "react-router-dom";

import { InternalPlayer } from "./player";
import { INDEX_ORDER } from "./constants/storageKeys";


/* Core CSS required for Ionic components to work properly */
import "@ionic/react/css/core.css";

/* Basic CSS for apps built with Ionic */
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";

/* Optional CSS utils that can be commented out */
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";

/* Theme variables */
import "./theme/variables.css";
import "./theme/main.css";

const indexEpisodeOrder = localStorage.getItem(INDEX_ORDER);

setupIonicReact();

const App: React.FC = () => {
  const episodes = useEpisodes();

  const initialEpisode = React.useMemo(() => {
    return [...episodes.values()].find((episode) => episode.order === (indexEpisodeOrder ? Number.parseInt(indexEpisodeOrder) : 0));
  }, [episodes]);

  if (!initialEpisode) return null;

  return (
    <Routes>
      <Route path="/episode/:episodeId" element={<InternalPlayer />} />
      <Route
        path="/"
        element={<Navigate to={`/episode/${initialEpisode.id}`} />}
      />
    </Routes>
  );
};

export default App;
