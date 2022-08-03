import * as React from 'react';

import ReactTooltip from 'react-tooltip';
import ClickAwayListener from 'react-click-away-listener';
import { Block } from 'baseui/block';
import { FormControl } from 'baseui/form-control';
import { Option, Select, SIZE } from 'baseui/select';

import { ControllerButton } from './ControllerButton';

import { LanguageIconOutline } from '../Icon/LanguageIconOutline';

import { iconDropShadowStyle } from '../../variables/iconDropShadowStyle';
import { useRandomId } from '../../hooks/useRandomId';

export interface ILanguageButtonProps {
  contentLanguage:string;
  subtitleLanguage:string;
  onContentLanguageChange:(lang:string)=>void
  onSubtitleLanguageChange:(lang:string)=>void
}

const contentLanguageOptions:Record<string, Option> = {
  en: { label: 'English', id: 'en' },
  'zh-Hans': { label: '简体中文', id: 'zh-Hans' },
};

const subtitleLanguageOptions:Record<string, Option> = {
  null: { label: 'Off', id: 'null' },
  en: { label: 'English', id: 'en' },
  'zh-Hans': { label: '简体中文', id: 'zh-Hans' },
};

export const LanguageButton: React.FC<ILanguageButtonProps> = React.memo((props) => {
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const controllerId = useRandomId('subtitle-button');

  const handleClickAway = React.useCallback(() => {
    ReactTooltip.hide(buttonRef.current!);
  }, []);

  return (
    <Block>
      <ControllerButton
        ref={buttonRef}
        data-tip={controllerId}
        data-for={controllerId}
        data-event="click"
      >
        <LanguageIconOutline width={20} height={20} {...iconDropShadowStyle} />
      </ControllerButton>
      <ReactTooltip
        id={controllerId}
        getContent={() => (
          <ClickAwayListener onClickAway={handleClickAway}>
            <Block>
              <FormControl label="Subtitle Language">
                <Select
                  value={[subtitleLanguageOptions[props.subtitleLanguage]]}
                  onChange={(param) => props.onSubtitleLanguageChange(param.value[0].id as string)}
                  size={SIZE.mini}
                  options={Object.values(subtitleLanguageOptions)}
                  clearable={false}
                  searchable={false}
                  // A really hacky workaround to avoid focus on the input element when on iOS
                  // Seems it does not break things (maybe a11y breaks but we don't care (for now))
                  overrides={{
                    InputContainer: {
                      component: () => {
                        return <></>;
                      },
                    },
                  }}
                />
              </FormControl>
              <FormControl label="Video Language">
                <Select
                  value={[contentLanguageOptions[props.contentLanguage]]}
                  onChange={(param) => props.onContentLanguageChange(param.value[0].id as string)}
                  size={SIZE.mini}
                  options={Object.values(contentLanguageOptions)}
                  clearable={false}
                  searchable={false}
                  // Same as above
                  overrides={{
                    InputContainer: {
                      component: () => {
                        return <></>;
                      },
                    },
                  }}
                />
              </FormControl>
            </Block>
          </ClickAwayListener>
        )}
        clickable
        type="dark"
        effect="solid"
      />
    </Block>
  );
});
