import * as React from 'react';
import cn from 'classnames';
import { Block } from 'baseui/block';
import { useStore } from '@nanostores/react';
import { useStyletron } from 'baseui';

import type { InterfaceExtensionComponent } from '../../types/ExtensionCore';
import { ModuleContainer } from '../Layout/ModuleContainer';
import { Loading } from './Loading';

const useStyles = () => {
  const [css, theme] = useStyletron();

  const stageContainerStyles = React.useMemo(() => css({
    height: '100%',
  }), []);

  const elementContainerStyles = React.useMemo(() => css({
    backgroundColor: theme.colors.backgroundAlwaysDark,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    overflowX: 'hidden',
    overflowY: 'hidden',
    pointerEvents: 'auto',
  }), [theme.colors.backgroundAlwaysDark]);

  return { stageContainerStyles, elementContainerStyles };
};

export const LoadingLayer: InterfaceExtensionComponent = React.memo((props) => {
  const { stageContainerStyles, elementContainerStyles } = useStyles();

  const stageEmpty = useStore(props.core.stageEmpty);

  return (
  <ModuleContainer>
    <Block className={cn(stageContainerStyles, elementContainerStyles)} display={stageEmpty ? 'block' : 'none'}>
      <Loading />
    </Block>
  </ModuleContainer>
  );
});
