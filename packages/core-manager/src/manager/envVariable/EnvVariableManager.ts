import { atom, computed } from 'nanostores';
import type { WritableAtom, ReadableAtom } from 'nanostores';

import { WithLogger } from '../../LogCollector';

import { getScreenSizeKeyword } from './utils/screenSize';
import { getBrowserRelatedEnvVariable } from './utils/envVariable';

import { DEFAULT_AVATAR } from './constant/defaultAvatar';

export interface IDefaultAdditionalEnvVariable {
  [key: string]: unknown;
}

export interface IUserRelatedEnvVariable {
  token: string;
  avatar: string;
  userName: string;
}

export interface IEnvVariable {
  [key: string]: unknown;
  __smartResourceConfig: Record<string, string>;
}

export const DEFAULT_LANGUAGE = 'en';

export class EnvVariableManager<
  T extends IDefaultAdditionalEnvVariable = IDefaultAdditionalEnvVariable
> extends WithLogger {
  private browserRelatedEnvVariable = getBrowserRelatedEnvVariable();

  public envVariableAtom: ReadableAtom<IEnvVariable>;

  public userRelatedEnvVariableAtom = atom<IUserRelatedEnvVariable>({
    token: '',
    avatar: DEFAULT_AVATAR,
    userName: '',
  });

  private screenSizeEnvVariableAtom = atom(getScreenSizeKeyword());

  private deviceTypeEnvVariableAtom = atom(
    this.browserRelatedEnvVariable.isTouchScreen ? 'touch' : 'mouse'
  );

  constructor(
    private languageAtom: WritableAtom<string>,
    private additionalEnvVariableAtom: WritableAtom<T>
  ) {
    super();
    this.envVariableAtom = computed(
      [
        this.userRelatedEnvVariableAtom,
        this.additionalEnvVariableAtom,
        this.languageAtom,
        this.deviceTypeEnvVariableAtom,
        this.screenSizeEnvVariableAtom,
      ],
      (user, additional, lang, device, screen) => {
        return {
          ...additional,
          ...this.browserRelatedEnvVariable,
          ...user,
          __smartResourceConfig: {
            lang: lang ?? DEFAULT_LANGUAGE,
            device,
            screen,
          },
        };
      }
    );

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.handleWindowResize);
      window.addEventListener('pointerdown', this.handlePointerDown);
    }
  }

  destroy = () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.handleWindowResize);
      window.removeEventListener('pointerdown', this.handlePointerDown);
    }
  };

  private handlePointerDown = (event: PointerEvent) => {
    let nextDeviceType = 'mouse';
    switch (event.pointerType) {
      case 'pen':
        nextDeviceType = 'touch';
        break;
      case 'touch':
        nextDeviceType = 'touch';
        break;
      case 'mouse':
        nextDeviceType = 'mouse';
        break;
      default:
        nextDeviceType = 'mouse';
    }

    if (nextDeviceType !== this.deviceTypeEnvVariableAtom.get()) {
      this.deviceTypeEnvVariableAtom.set(nextDeviceType);
    }
  };

  private handleWindowResize = () => {
    const nextScreenSize = getScreenSizeKeyword();
    if (nextScreenSize !== this.screenSizeEnvVariableAtom.get()) {
      this.screenSizeEnvVariableAtom.set(nextScreenSize);
    }
  };
}
