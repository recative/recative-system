import * as React from 'react';

import { useKonami } from 'react-konami-code';
import { useStyletron } from 'baseui';

import type { StyleObject } from 'styletron-react';
import type { EpisodeCore } from '@recative/core-manager';

import { Block } from 'baseui/block';
import { HeadingXSmall } from 'baseui/typography';

import { RecativeLogo } from '../Logo/RecativeLogo';

import { useEvent } from '../../hooks/useEvent';

export interface IInspector<T extends Record<string, unknown>> {
  core: EpisodeCore<T>;
}

const containerStyle: StyleObject = {
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  justifyContent: 'center',
  alignItems: 'center',
  position: 'fixed',
  display: 'flex',
  pointerEvents: 'none',
}

const contentStyle: StyleObject = {
  maxWidth: '480px',
  maxHeight: '600px',
  margin: '20px',
  padding: '8px',
  background: 'rgba(0,0,0,0.99)',
  color: 'white',
}

export const Inspector = <T extends Record<string, unknown>>(props: IInspector<T>) => {
  const [css] = useStyletron();
  const [showInspector, setShowInspector] = React.useState<boolean>(false);

  const handleKonami = useEvent(() => {
    setShowInspector((x) => !x);
  });

  useKonami(handleKonami);


  if (!showInspector) return null;

  return (
    <Block className={css(containerStyle)}>
      <Block className={css(contentStyle)}>
        <HeadingXSmall display="flex" alignItems="center">
          <RecativeLogo height="1.5em" /><Block marginLeft="8px"> | Inspector</Block>
        </HeadingXSmall>
      </Block>
    </Block>
  )
}
