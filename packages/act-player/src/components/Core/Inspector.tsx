import * as React from 'react';
import cn from 'classnames';

import useConstant from 'use-constant';
import { useKonami } from 'react-konami-code';
import { useStyletron } from 'baseui';

import type { StyleObject } from 'styletron-react';
import type { EpisodeCore, ContentSequence } from '@recative/core-manager';

import { Block } from 'baseui/block';
import { StatefulTooltip } from 'baseui/tooltip';
import { Button, SIZE as BUTTON_SIZE } from "baseui/button";
import { HeadingXSmall, LabelMedium, LabelXSmall } from 'baseui/typography';

import { SparkLine } from './utils/SparkLine';
import { FpsRecorder } from './utils/FpsRecorder';
import { MemoryRecorder } from './utils/MemoryRecorder';

import { useRaf } from './hooks/useRaf';

import { RecativeLogo } from '../Logo/RecativeLogo';

import { useEvent } from '../../hooks/useEvent';
import { forEachConfig, getRecativeConfigurations } from './utils/storageKeys';

const s = (x: boolean) => x.toString();

const KONAMI_CONFIG = {
  code: [49, 49, 52, 53, 19, 52],
}

export interface IInspector<T extends Record<string, unknown>> {
  core: EpisodeCore<T> | null;
}

const titleStyle: StyleObject = {
  marginTop: '16px',
  marginBottom: '20px',
  alignItems: 'center',
  display: 'flex',
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
  overflowY: 'auto',
}

const contentGroupStyle: StyleObject = {
  marginTop: '4px',
  paddingLeft: '6px',
  borderLeft: '2px solid rgba(255, 255, 255, 0.5)',
}

const listContentStyle: StyleObject = {
  marginTop: '0',
  marginBottom: '0',
  marginLeft: '12px',
  lineHeight: '16px !important',
}

const editorListContentStyle: StyleObject = {
  boxShadow: '0px 1px 0px 0px rgba(255, 255, 255, 0.45)',
  pointerEvents: 'all',
}

const fpsStyles: StyleObject = {
  left: '0',
  bottom: '0',
  width: '100%',
  fontSize: '24px !important',
  fontWeight: 'bold !important',
  textAlign: 'right',
  position: 'absolute',
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
  hint?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const sectionStyle: StyleObject = {
  paddingTop: '1px',
  paddingBottom: '1px',
  display: 'flex',
}

const preStyle: StyleObject = {
  whiteSpace: 'pre',
  fontFamily: 'monospace',
}

interface IValInputProps {
  className?: string;
  value: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const ValueInput: React.FC<IValInputProps> = ({ className, value, onChange }) => {
  const [css, theme] = useStyletron();

  const styles: StyleObject = {
    margin: 0,
    padding: 0,
    background: 'transparent',
    border: 0,
    color: 'white',
    outline: 0,
    pointerEvents: 'none',
    ...theme.typography.ParagraphXSmall,
  }

  return (
    <input
      className={
        cn(
          css(styles),
          { [css(editorListContentStyle)]: !!onChange },
          className
        )
      }
      value={value}
      onChange={onChange}
    />
  )

}

const SectionContent: React.FC<ISectionContentProps> = ({
  title, content, hint, onChange
}) => {
  const [css] = useStyletron();

  return (
    <Block className={css(sectionStyle)}>
      <LabelXSmall>{title}</LabelXSmall>
      {
        hint ? (
          <StatefulTooltip
            content={<Block className={css(preStyle)}>{hint}</Block>}
          >
            <ValueInput
              className={css(listContentStyle)}
              onChange={onChange}
              value={content}
            />
          </StatefulTooltip>
        ) : (
          <ValueInput
            className={css(listContentStyle)}
            onChange={onChange}
            value={content}
          />
        )
      }
    </Block>
  )
}

interface MemoryInfo {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
}

declare global {
  interface Window {
    __RECATIVE_INTERNAL_REQUIRE_MEMORY_RECORD__?: () => [number, number] | Promise<[number, number]>;

    performance: {
      memory: MemoryInfo;
    }
  }
}

if (!window.__RECATIVE_INTERNAL_REQUIRE_MEMORY_RECORD__) {
  if (Reflect.get(performance, 'memory')) {
    window.__RECATIVE_INTERNAL_REQUIRE_MEMORY_RECORD__ = () => [window.performance.memory.usedJSHeapSize, window.performance.memory.jsHeapSizeLimit];
  }
}

export const ConfigureEditor = React.memo(() => {
  const [css] = useStyletron();
  const [config, setConfig] = React.useState(getRecativeConfigurations);

  const callbacks = React.useMemo(() => {
    const result = new Map<string, (event: React.ChangeEvent<HTMLInputElement>) => void>();

    forEachConfig(
      config,
      (compoundKey, _, __, ___, key, keyMap) => {
        result.set(
          compoundKey,
          (event) => {
            setConfig(() => {
              keyMap.set(key, event.currentTarget.value);
              return config;
            });
          }
        );
      });

    return result;
  }, [config]);

  const syncConfig = useEvent(() => {
    forEachConfig(
      config,
      (_, value, domain, product, key) => {
        localStorage.setItem(`${domain}/${product}/${key}`, value);
      }
    );

    // eslint-disable-next-line no-alert
    alert(`Configuration synced, refresh the page to activate the changes`);
  });

  return (
    <>
      {[...config.keys()].map((domain) => {
        const productMap = config.get(domain)!;

        return <Block key={domain} paddingTop="4px">
          <SectionContent
            title={domain.toUpperCase()}
            content=""
          />

          {
            [...productMap.keys()].map((product) => {
              const keyMap = productMap.get(product)!;

              return (
                <Block
                  key={`${domain}~~~${product}`}
                  className={css(contentGroupStyle)}
                >
                  <SectionContent
                    title={`☆ ${product.toUpperCase()}`}
                    content=""
                  />
                  {
                    [...keyMap.keys()].map((key) => {
                      const configKey = `${domain}~~~${product}~~~${key}`;

                      return (
                        <SectionContent
                          key={configKey}
                          title={key.toUpperCase()}
                          content={keyMap.get(key) ?? ''}
                          onChange={callbacks.get(configKey)}
                        />
                      )
                    })
                  }
                </Block>
              )
            })
          }
        </Block>
      })}

      <Block paddingTop="8px">
        <Button
          onClick={syncConfig}
          size={BUTTON_SIZE.mini}
        >
          SET CONFIG
        </Button>
      </Block>
    </>
  )
});

export const Inspector = <T extends Record<string, unknown>>({ core }: IInspector<T>) => {
  const [css] = useStyletron();
  const fpsCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const memoryRef = React.useRef<HTMLCanvasElement>(null);

  const [averageDeltaT, setAverageDeltaT] = React.useState(0);
  const fpsSparkLine = useConstant(() => new SparkLine(0, 120));
  const fpsRecorder = useConstant(() => new FpsRecorder());

  const [averageMemoryPercent, setAverageMemoryPercent] = React.useState(0);
  const memorySparkLine = useConstant(() => new SparkLine(0, 100));
  const memoryRecorder = useConstant(() => new MemoryRecorder());
  const memoryRecordRequested = React.useRef<boolean | null>(true);

  const [showInspector, setShowInspector] = React.useState<boolean>(false);

  const handleKonami = useEvent(() => {
    setShowInspector((x) => !x);
  });

  useKonami(handleKonami, KONAMI_CONFIG);

  if (fpsCanvasRef.current && fpsSparkLine.$canvas !== fpsCanvasRef.current) {
    fpsSparkLine.setCanvas(fpsCanvasRef.current);
  }

  if (memoryRef.current && memorySparkLine.$canvas !== memoryRef.current) {
    memorySparkLine.setCanvas(memoryRef.current);
  }

  const updateMemory = useEvent(([u, t]: [number, number]) => {
    memoryRecordRequested.current = true;
    memoryRecorder.tick(u, t);

    setAverageMemoryPercent(u / t);
    memorySparkLine.updateData(
      memoryRecorder.memoryBuffer.map(([u0, t0]) => (u0 / t0) * 100)
    );
  });

  const drawChart = useEvent(() => {
    fpsRecorder.tick();

    setAverageDeltaT(1 / fpsRecorder.averageΔt * 1000);
    fpsSparkLine.updateData(
      fpsRecorder.ΔtBuffer.map((x) => 1 / x * 1000)
    );

    if (!window.__RECATIVE_INTERNAL_REQUIRE_MEMORY_RECORD__) return;
    if (!memoryRecordRequested.current) return;

    const memory = window.__RECATIVE_INTERNAL_REQUIRE_MEMORY_RECORD__();

    if ('then' in memory) {
      memoryRecordRequested.current = false;
      memory.then(updateMemory);
    } else {
      updateMemory(memory);
    }
  });

  useRaf(drawChart);

  if (!showInspector) return null;

  if (!core) {
    return <Block className={css(containerStyle)}>
      <Block className={css(contentStyle)}>
        <HeadingXSmall className={css(titleStyle)}>
          <RecativeLogo height="1.5em" /><Block marginLeft="8px"> | Inspector</Block>
        </HeadingXSmall>

        <LabelMedium>
          EPISODE CORE IS NOT READY
        </LabelMedium>
      </Block>
    </Block>
  }

  const { width, height } = core.resolution.get();

  const browser = Reflect.get(core.envVariableManager, 'browserRelatedEnvVariable');

  const mainSequence = Reflect.get(core, 'mainSequence') as ContentSequence | null;

  const progress = mainSequence?.progress.get();

  const memoryAnalysisAvailable = !!window.__RECATIVE_INTERNAL_REQUIRE_MEMORY_RECORD__;

  return (
    <Block className={css(containerStyle)}>
      <style>{`
        .recative-inspector {
          scrollbar-width: auto;
          scrollbar-color: #d9d9d9 #000000;
        }

        .recative-inspector::-webkit-scrollbar {
          width: 4px;
        }

        .recative-inspector::-webkit-scrollbar-track {
          background: #000000;
        }

        .recative-inspector::-webkit-scrollbar-thumb {
          border: 0px none #ffffff;
        }
      `}</style>
      <Block className={cn(css(contentStyle), 'recative-inspector')}>
        <HeadingXSmall className={css(titleStyle)}>
          <RecativeLogo height="1.5em" /><Block marginLeft="8px"> | Inspector</Block>
        </HeadingXSmall>

        <SectionTitle>
          SYSTEM STATUS
        </SectionTitle>

        <Block display="flex">
          <Block width={memoryAnalysisAvailable ? "50%" : "100%"}>
            <Block height="120px" position="relative">
              <canvas ref={fpsCanvasRef} />
              <ValueInput
                className={css(fpsStyles)}
                value={averageDeltaT.toFixed(0)}
              />
            </Block>
            <Block paddingLeft="6px">
              <SectionContent
                title="ΔT"
                content={fpsRecorder.lastΔt.toFixed(2)}
              />
              <SectionContent
                title="FPS"
                content={(1 / fpsRecorder.lastΔt * 1000).toFixed(2)}
              />
            </Block>
          </Block>
          {
            memoryAnalysisAvailable && (
              <Block width="50%">
                <Block height="120px" position="relative">
                  <canvas ref={memoryRef} />
                  <ValueInput
                    className={css(fpsStyles)}
                    value={`${(averageMemoryPercent * 100).toFixed(2)}%`}
                  />
                </Block>
                <Block paddingLeft="6px">
                  <SectionContent
                    title="Usage"
                    content={memoryRecorder.lastMemory[0].toString()}
                  />
                  <SectionContent
                    title="Total"
                    content={memoryRecorder.lastMemory[1].toString()}
                  />
                </Block>
              </Block>
            )
          }
        </Block>

        <SectionTitle>
          EPISODE CORE STATE
        </SectionTitle>

        <SectionContent
          title="EPISODE ID"
          content={`${core.episodeId}`}
        />

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

        <SectionContent
          title="CONTENT LANG / SUBTITLE LANG"
          content={`${core.contentLanguage.get()} / ${core.subtitleLanguage.get()}`}
        />

        <SectionContent
          title="DURATION / PROGRESS"
          content={`${core.duration.get()} / ${core.progress.get().progress.toFixed(2)}(${core.progress.get().segment})`}
        />

        <SectionContent
          title="TIME / PRECISE TIME"
          content={`${core.time.get()} / ${core.preciseTime.get()}`}
        />

        <SectionContent
          title="MANAGED CORE STATE"
          content={`${core.managedCoreState.get().size}`}
        />

        <SectionTitle>
          ENV MANAGER
        </SectionTitle>

        <SectionContent
          title="LANG"
          content={Reflect.get(core.envVariableManager, 'languageAtom').get()}
        />

        <SectionContent
          title="SCR SIZE / DEV TYPE"
          content={`${Reflect.get(core.envVariableManager, 'screenSizeEnvVariableAtom').get()} / ${Reflect.get(core.envVariableManager, 'deviceTypeEnvVariableAtom').get()}`}
        />

        <SectionContent
          title="MOBILE / WECHAT / OS"
          content={`${s(browser.isMobile)} / ${s(browser.isWeChat)} / ${s(browser.os)}`}
        />

        <SectionTitle>
          ASSETS / MAIN SEQUENCE
        </SectionTitle>

        <SectionContent
          title="SHOWING CONTENTS COUNT"
          content={`${Reflect.get(core, 'showingContentCount')?.get() ?? 'None'}`}
        />
        {
          mainSequence && (
            <>
              <SectionContent
                title="DURATION / PROGRESS"
                content={`${mainSequence.duration ?? 'UNKNOWN'} / ${progress?.progress.toFixed(2)}(${progress?.segment})`}
              />

              <SectionContent
                title="DUMB TIME / PRECISE TIME"
                content={`${mainSequence.time.atom.get()} / ${mainSequence.preciseTime.get()}`}
              />

              <SectionContent
                title="SWITCHING / 1ST CONTENT SWITCHING"
                content={`${s(mainSequence.switching)} / ${s(mainSequence.firstContentSwitched)}`}
              />

              <SectionContent
                title="LAST / CRT / NXT SEG"
                content={`${mainSequence.lastSegment} / ${mainSequence.currentSegment} / ${mainSequence.nextSegment}`}
              />

              <SectionContent
                title="NXT SEG START TIME"
                content={`${mainSequence.nextSegmentStartTime}`}
              />

              <SectionContent
                title="NXT BLOCKERS / CRT BLOCKERS"
                content={`${mainSequence.nextContentSetupBlocker.size} / ${mainSequence.switchingBlocker.size}`}
              />

              <SectionContent
                title="SLF PLAYING / PARENT PLAYING"
                content={`${mainSequence.playing.get()} / ${mainSequence.parentPlaying.get()}`}
              />

              <SectionContent
                title="SLF SHOWING / PARENT SHOWING"
                content={`${mainSequence.selfShowing} / ${mainSequence.parentShowing}`}
              />

              <SectionContent
                title="STUCK"
                content={`${mainSequence.stuck.get()}`}
              />

              <SectionContent
                title="VOLUME"
                content={`${mainSequence.volume}`}
              />
            </>
          )
        }

        {mainSequence
          ? (
            mainSequence.contentList.map((c) => {
              const i = mainSequence.managedContentInstanceMap.get(c.id);

              if (!i) {
                return (
                  <Block key={c.id} className={css(contentGroupStyle)}>
                    <SectionContent
                      title="ID / STATE"
                      content={`${c.id} / NOT AVAILABLE`}
                    />
                  </Block>
                )
              }

              return (
                <Block key={c.id} className={css(contentGroupStyle)}>
                  <SectionContent
                    title="ID / DURATION / STUCK"
                    content={`${i.contentId} / ${c.duration} / ${i.timeline.isStuck()}`}
                  />

                  <SectionContent
                    title="EXTENSION ID"
                    content={`${c.spec.contentExtensionId}`}
                    hint={JSON.stringify(c.spec.extensionConfigurations, null, 2)}
                  />

                  <SectionContent
                    title="STATE / PRELOADED"
                    content={`${i.state} / ${s(mainSequence.preloadedContents.has(c))}`}
                  />

                  <SectionContent
                    title="SELF SHOWING / PARENT SHOWING"
                    content={`${i.selfShowing} / ${i.parentShowing}`}
                  />

                  <SectionContent
                    title="REMOTE PROGRESS / REMOTE STUCK"
                    content={`${i.remote.progress} / ${i.remote.stuck}`}
                  />

                  <SectionContent
                    title="MANAGED / ADDITIONAL CORE STATE"
                    content={`${i.managedCoreStateList.state.size} / ${i.additionalManagedCoreStateList.state.size}`}
                  />

                  <SectionContent
                    title="TASK QUEUE"
                    content={`${(Reflect.get(i.taskQueueManager, 'tasks') as Map<unknown, unknown>).size}`}
                  />
                </Block>
              )
            })
          )
          : (
            <SectionContent title="STATE"
              content="Not Ready"
            />
          )
        }

        <SectionTitle>
          ACT PLAYER
        </SectionTitle>

        <SectionContent
          title="STAGE EMPTY"
          content={`${s(core.stageEmpty.get())}`}
        />

        {
          [
            ...(Reflect.get(core, 'components') as Map<string, unknown>).keys()
          ].map((k, i) => {
            return (
              <SectionContent
                key={i}
                title={`COMP${i}`}
                content={k}
              />
            )
          })
        }

        <SectionTitle>
          CONFIGURATIONS
        </SectionTitle>

        <ConfigureEditor />
      </Block>
    </Block>
  )
}
