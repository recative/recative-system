import cn from 'classnames';
import { useStore } from '@nanostores/react';
import { Block } from 'baseui/block';
import { useStyletron } from 'baseui';
import type { StyleObject } from 'styletron-react';

import { filterSubtitleState } from '@recative/core-manager';
import type { InterfaceExtensionComponent } from '../../types/ExtensionCore';
import { ModuleContainer } from '../Layout/ModuleContainer';

const SUBTITLE_CONTAINER_STYLE: StyleObject = {
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
  alignItems: 'center',
  paddingLeft: '12px',
  paddingRight: '12px',
  paddingTop: '12px',
  paddingBottom: '64px',
  fontSize: '24px',
  lineHeight: '1.5',
  color: 'white',
  pointerEvents: 'none',
  textShadow: 'rgb(34 34 34) 1.33333px 1.33333px 2px, rgb(34 34 34) 1.33333px 1.33333px 2.66667px, rgb(34 34 34) 1.33333px 1.33333px 3.33333px',
};

export const Subtitle: InterfaceExtensionComponent = (props) => {
  const [css] = useStyletron();

  const states = useStore(props.core.managedCoreState);
  const subtitle:string[] = filterSubtitleState(states);

  const controllerContainerStyles = cn(css(SUBTITLE_CONTAINER_STYLE));

  return <ModuleContainer
    id="subtitleContainer"
    key="subtitle"
    className={cn(controllerContainerStyles)}
  >{subtitle.map((text, id) => (
    <Block key={id}>
      {text}
    </Block>
  ))}
  </ModuleContainer>;
};
