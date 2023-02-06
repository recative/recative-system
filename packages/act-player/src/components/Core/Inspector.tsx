import * as React from 'react';

import { useKonami } from 'react-konami-code';
import { useStyletron } from 'baseui';

import type { StyleObject } from 'styletron-react';
import type { EpisodeCore } from '@recative/core-manager';

import { Block } from 'baseui/block';
import { HeadingXSmall, LabelMedium, LabelSmall, LabelXSmall, ParagraphSmall, ParagraphXSmall } from 'baseui/typography';

import { RecativeLogo } from '../Logo/RecativeLogo';

import { useEvent } from '../../hooks/useEvent';

const s = (x: boolean) => x.toString();

export interface IInspector<T extends Record<string, unknown>> {
  core: EpisodeCore<T> | null;
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
  minWidth: '400px',
  minHeight: '600px',
  margin: '20px',
  padding: '16px',
  background: 'rgba(0,0,0,0.99)',
  color: 'white',
}

const listContentStyle: StyleObject = {
  marginTop: '0',
  marginBottom: '0',
  marginLeft: '12px',
  lineHeight: '16px !important',
}

const sectionTitleStyle: StyleObject = {
  marginTop: '8px',
  borderBottom: '1px dashed currentColor',
  marginBottom: '4px',
  paddingBottom: '3px',
}

const SectionTitle: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [css] = useStyletron();

  return (
    <LabelMedium className={css(sectionTitleStyle)}>
      {children}
    </LabelMedium>
  )
}

interface ISectionContentProps {
  title: string;
  content: string;
}

const sectionStyle: StyleObject = {
  paddingTop: '1px',
  paddingBottom: '1px',
  display: 'flex',
}

const SectionContent: React.FC<ISectionContentProps> = ({ title, content }) => {
  const [css] = useStyletron();

  return (
    <Block className={css(sectionStyle)}>
      <LabelXSmall>{title}</LabelXSmall>
      <ParagraphXSmall className={css(listContentStyle)}>{content}</ParagraphXSmall>
    </Block>
  )
}

export const Inspector = <T extends Record<string, unknown>>({ core }: IInspector<T>) => {
  const [css] = useStyletron();
  const [showInspector, setShowInspector] = React.useState<boolean>(false);

  const handleKonami = useEvent(() => {
    setShowInspector((x) => !x);
  });

  useKonami(handleKonami);

  if (!showInspector) return null;

  if (!core) {
    return <Block className={css(containerStyle)}>
      <Block className={css(contentStyle)}>
        <HeadingXSmall display="flex" alignItems="center">
          <RecativeLogo height="1.5em" /><Block marginLeft="8px"> | Inspector</Block>
        </HeadingXSmall>

        <LabelMedium>
          EPISODE CORE IS NOT READY
        </LabelMedium>
      </Block>
    </Block>
  }

  const { width, height } = core.resolution.get();

  return (
    <Block className={css(containerStyle)}>
      <Block className={css(contentStyle)}>
        <HeadingXSmall display="flex" alignItems="center">
          <RecativeLogo height="1.5em" /><Block marginLeft="8px"> | Inspector</Block>
        </HeadingXSmall>

        <SectionTitle>
          EPISODE CORE STATE
        </SectionTitle>

        <SectionContent
          title="READY / STATE"
          content={`${s(Reflect.get(core, 'ready'))} / ${core.coreState.get()}`}
        />

        <SectionContent
          title="FAST TASKS / SLOW TASKS"
          content={`${core.fastTaskQueue.remainTasks} / ${core.slowTaskQueue.remainTasks}`}
        />

        <SectionContent
          title="AUDIO STATION RDY / AUTOPLAY RDY"
          content={`${s(core.audioStation.activated)} / ${s(core.autoplayReady.get())}`}
        />

        <SectionContent
          title="PLAYING / STUCK"
          content={`${s(core.playing.get())} / ${s(core.stuck.get())}`}
        />

        <SectionContent
          title="VOLUME / FULL SCREEN"
          content={`${core.volume.get()} / ${s(core.fullScreen.get())}`}
        />

        <SectionContent
          title="MINI MODE / RESOLUTION"
          content={`${s(core.miniMode.get())} / ${width}x${height}`}
        />

        <SectionTitle>
          ENV MANAGER
        </SectionTitle>

        <SectionTitle>
          ASSETS
        </SectionTitle>

        <SectionContent
          title="SHOWING CONTENTS COUNT"
          content={`${Reflect.get(core, 'showingContentCount')?.get() ?? 'None'}`}
        />

        <SectionTitle>
          ACT PLAYER
        </SectionTitle>

        <SectionContent
          title="STAGE EMPTY"
          content={`${s(core.stageEmpty.get())}`}
        />

        <Block>
          <LabelSmall>
            COMPONENTS
          </LabelSmall>
          <ParagraphSmall className={css(listContentStyle)}>
            -----
          </ParagraphSmall>
        </Block>
      </Block>
    </Block>
  )
}
