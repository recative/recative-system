/* eslint-disable no-alert */
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { persistentAtom } from '@nanostores/persistent';

import { useStore } from '@nanostores/react';

import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useParams,
  useNavigate,
} from 'react-router-dom';
import { Client as Styletron } from 'styletron-engine-monolithic';
import { DarkTheme, BaseProvider } from 'baseui';
import { Provider as StyletronProvider } from 'styletron-react';

import {
  useEpisodes,
  useSdkConfig,
  PlayerSdkProvider,
  ContentModuleFactory,
} from '@recative/client-sdk';
import { Error, Loading } from '@recative/act-player';

import { Block } from 'baseui/block';
import { Drawer, SIZE as DRAWER_SIZE } from 'baseui/drawer';
import { Button, KIND, SIZE as BUTTON_SIZE } from 'baseui/button';
import type { ButtonOverrides } from 'baseui/button';

import { useEnvVariable } from './utils/useEnvVariable';

const PREFERRED_UPLOADERS = [
  '@recative/uploader-extension-studio/ResourceManager',
  '@recative/uploader-polyv-vod/PolyVUploader',
];

const TRUSTED_UPLOADERS = [
  '@recative/uploader-extension-studio/ResourceManager',
];

if (window.localStorage.getItem('@recative/act-player/error-request')) {
  PREFERRED_UPLOADERS.push('@recative/uploader-extension-error/not-exists');
}

const temporaryPath = localStorage.getItem('@recative/demo-player/path');
const indexEpisodeOrder = localStorage.getItem(
  '@recative/mobile-template/index-order',
);
const dataType = localStorage.getItem('@recative/demo-player/data-type') as
  | 'bson'
  | 'json';

const MENU_ATOM = persistentAtom<'enabled' | 'disabled'>('menu', 'disabled');

const BUTTON_OVERRIDES: ButtonOverrides = {
  BaseButton: {
    style: {
      width: '100%',
      textAlign: 'left',
      display: 'block',
    },
  },
};

if (window.location.search.includes('enableEpisodeList')) {
  MENU_ATOM.set('enabled');
}

if (window.location.search.includes('disableEpisodeList')) {
  MENU_ATOM.set('disabled');
}

const engine = new Styletron();

const Player: React.FC = () => {
  const navigate = useNavigate();
  const { episodeId } = useParams<{ episodeId: string }>();

  const handleEpisodeIdUpdate = React.useCallback(async (id: string, forceReload?: boolean) => {
    const url = `/episode/${id}`;
    if (forceReload) {
      window.location.href = url;
    } else {
      navigate(url);
    }
  }, [navigate]);

  const envVariable = useEnvVariable();
  const dependencies = React.useMemo(() => ({ navigate }), [navigate]);

  const config = useSdkConfig();

  const Content = React.useMemo(
    () => ContentModuleFactory(config.pathPattern, config.dataType),
    [config.pathPattern, config.dataType],
  );

  if (
    window.location.protocol !== 'https:'
    && window.location.hostname !== 'localhost'
    && window.location.hostname !== '127.0.0.1'
  ) {
    return <Error>HTTPS Protocol Required</Error>;
  }

  return (
    <React.Suspense fallback={<Loading />}>
      <Content
        episodeId={episodeId}
        onEpisodeIdUpdate={handleEpisodeIdUpdate}
        envVariable={envVariable}
        userData={undefined}
        trustedUploaders={TRUSTED_UPLOADERS}
        preferredUploaders={PREFERRED_UPLOADERS}
        LoadingComponent={Loading}
        playerPropsHookDependencies={dependencies}
      />
    </React.Suspense>
  );
};

const App: React.FC = () => {
  const navigate = useNavigate();
  const episodes = useEpisodes();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const menuStatus = useStore(MENU_ATOM);

  const items = React.useMemo(() => {
    return episodes
      ? [...episodes.values()].map(({ id, label }) => ({
        id,
        label: label.en || label['zh-Hans'],
        onClick: () => {
          navigate(`/episode/${id}`);
          setDrawerOpen(false);
        },
      }))
      : [];
  }, [episodes, navigate]);

  const initialEpisode = React.useMemo(() => {
    return [...episodes.values()].find(
      (episode) => episode.order === (indexEpisodeOrder ?? 0),
    );
  }, [episodes]);

  if (!episodes) {
    return <Loading />;
  }

  return (
    <Block height="100%" display="flex">
      <Block width="100%">
        <Routes>
          <Route path="/episode/:episodeId" element={<Player />} />
          <Route
            path="/"
            element={
              initialEpisode ? (
                <Navigate to={`/episode/${initialEpisode.id}`} />
              ) : (
                <Loading />
              )
            }
          />
        </Routes>
      </Block>
      <Block position="fixed" top="10px" right="10px">
        {menuStatus === 'enabled' && (
          <Button
            onClick={() => setDrawerOpen(true)}
            kind={KIND.secondary}
            size={BUTTON_SIZE.mini}
          >
            MENU
          </Button>
        )}
      </Block>
      {/** @ts-ignore */}
      <Drawer
        isOpen={drawerOpen}
        size={DRAWER_SIZE.auto}
        onClose={() => setDrawerOpen(false)}
      >
        {items.map((item) => {
          return (
            <Button
              key={item.id}
              onClick={item.onClick}
              kind={KIND.tertiary}
              size={BUTTON_SIZE.mini}
              overrides={BUTTON_OVERRIDES}
            >
              <Block>{item.label}</Block>
              <Block>{item.id}</Block>
            </Button>
          );
        })}
      </Drawer>
    </Block>
  );
};

export const renderPlayer = (selector = '#app', resourceServerPort = 9999) => {
  const app = document.querySelector(selector);
  if (!app) {
    throw new TypeError(`No element found for selector ${selector}`);
  }
  const root = createRoot(app);

  const pathBase = `${window.location.protocol}//${window.location.hostname}:${resourceServerPort}/preview`;

  fetch(`${pathBase}/constants.json`)
    .then((response) => response.json())
    .then((data) => {
      Reflect.set(window, 'constant', data);

      if (typeof data === 'object' && data !== null) {
        if (typeof data.localStorage === 'object' && data.localStorage !== null) {
          Object.keys(data.localStorage).forEach((key) => {
            localStorage.setItem(key, data.localStorage[key]);
          });
        }
      }
    })
    .finally(() => {
      root.render(
      <StyletronProvider value={engine}>
        <BaseProvider theme={DarkTheme}>
          <PlayerSdkProvider
            pathPattern={temporaryPath ?? `${pathBase}/$fileName`}
            dataType={dataType ?? 'json'}
          >
            <HashRouter>
              <App />
            </HashRouter>
          </PlayerSdkProvider>
        </BaseProvider>
      </StyletronProvider>,
      );
    });
};
