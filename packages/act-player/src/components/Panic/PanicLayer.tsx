import * as React from 'react';
import cn from 'classnames';
import { Block } from 'baseui/block';
import { useStore } from '@nanostores/react';
import { useStyletron } from 'baseui';

import type { InterfaceExtensionComponent } from '../../types/ExtensionCore';
import { ModuleContainer } from '../Layout/ModuleContainer';
import { Error } from './Error';

const useStyles = () => {
  const [css, theme] = useStyletron();

  const stageContainerStyles = React.useMemo(
    () => css({
      height: '100%',
    }),
    [css],
  );

  const elementContainerStyles = React.useMemo(
    () => css({
      backgroundColor: theme.colors.backgroundAlwaysDark,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      overflowX: 'hidden',
      overflowY: 'hidden',
      pointerEvents: 'auto',
    }),
    [css, theme.colors.backgroundAlwaysDark],
  );

  return { stageContainerStyles, elementContainerStyles };
};

export const PanicLayer: InterfaceExtensionComponent = React.memo((props) => {
  const { stageContainerStyles, elementContainerStyles } = useStyles();

  const panicCode = useStore(props.core.panicCode);

  return (
    <ModuleContainer>
      <Block
        className={cn(stageContainerStyles, elementContainerStyles)}
        display={panicCode ? 'block' : 'none'}
      >
        {panicCode && <Error>{panicCode}</Error>}
      </Block>
    </ModuleContainer>
  );
});
