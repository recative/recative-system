import { RawUserImplementedFunctions } from '@recative/definitions';
import { atom } from 'nanostores';
import EventTarget from '@ungap/event-target';
import { EpisodeCore } from './episodeCore';
import { IDefaultAdditionalEnvVariable, IUserRelatedEnvVariable } from './manager/envVariable/EnvVariableManager';
import { CustomEventHandler, EpisodeData } from './types';
import { readonlyAtom } from './utils/nanostore';

export interface SegmentStartEventDetail {
  episodeId:string,
  segment:number,
}

export interface SegmentEndEventDetail {
  episodeId:string,
  segment:number,
}

export interface EndEventDetail {
  episodeId:string,
}

export interface InitializedEventDetail {
  episodeId:string,
}

export type SeriesCoreEventTarget = EventTarget & {
  addEventListener(
    type: 'segmentStart',
    callback: CustomEventHandler<SegmentStartEventDetail>
  ): void,
  addEventListener(
    type: 'segmentEnd',
    callback: CustomEventHandler<SegmentEndEventDetail>
  ): void,
  addEventListener(
    type: 'end',
    callback:CustomEventHandler<EndEventDetail>
  ): void,
  addEventListener(
    type: 'initialized',
    callback: CustomEventHandler<InitializedEventDetail>
  ): void,
};

export interface ISeriesCoreConfig {
  navigate: (episodeId: string, forceReload?: boolean) => Promise<void>;
  getEpisodeMetadata: (episodeId: string) => IEpisodeMetadata;
}

export interface IEpisodeMetadata {
  attemptAutoplay?: boolean;
  defaultContentLanguage?: string;
  defaultSubtitleLanguage?: string;
  episodeData: Promise<EpisodeData>;
}

export interface IPlayerProps<
  T extends IDefaultAdditionalEnvVariable = IDefaultAdditionalEnvVariable,
  > {
  episodeCore: EpisodeCore<T>
}

export class SeriesCore<T extends IDefaultAdditionalEnvVariable = IDefaultAdditionalEnvVariable> {
  private internalPlayerProps = atom<IPlayerProps<T> | null>(null);

  readonly playerProps = readonlyAtom(this.internalPlayerProps);

  private destroyPromise: Promise<void> | null = null;

  private switching: boolean = false;

  readonly envVariable = atom<T>({} as T);

  readonly userData = atom<IUserRelatedEnvVariable | undefined>();

  readonly userImplementedFunction = atom<Partial<RawUserImplementedFunctions>>({});

  readonly eventTarget = new EventTarget() as SeriesCoreEventTarget;

  private updateEnvVariable = (envVariable: T) => {
    this.ensureNotDestroying();
    const playProps = this.playerProps.get();
    if (playProps !== null) {
      playProps.episodeCore.additionalEnvVariable.set(envVariable);
    }
  };

  private updateUserData = (userData: IUserRelatedEnvVariable | undefined) => {
    this.ensureNotDestroying();
    const playProps = this.playerProps.get();
    if (playProps !== null && userData !== undefined) {
      playProps.episodeCore.envVariableManager.userRelatedEnvVariableAtom.set(userData);
    }
  };

  private updateUserImplementedFunction = (
    userImplementedFunction: Partial<RawUserImplementedFunctions>,
  ) => {
    this.ensureNotDestroying();
    const playProps = this.playerProps.get();
    if (playProps !== null) {
      playProps.episodeCore.setUserImplementedFunctions(userImplementedFunction);
    }
  };

  constructor(private config: ISeriesCoreConfig) {
    this.envVariable.subscribe(this.updateEnvVariable);
    this.userData.subscribe(this.updateUserData);
    this.userImplementedFunction.subscribe(this.updateUserImplementedFunction);
  }

  setEpisode = async (
    episodeId: string, forceReload?: boolean, assetOrder?: number, assetTime?: number,
  ) => {
    this.ensureNotDestroying();
    if (this.switching) {
      return;
    }
    this.switching = true;
    const metadata = this.config.getEpisodeMetadata(episodeId);
    const oldPlayProps = this.playerProps.get();
    if (oldPlayProps !== null) {
      if (oldPlayProps.episodeCore.episodeId === episodeId) {
        oldPlayProps.episodeCore.seek(assetOrder ?? 0, assetTime ?? 0);
        this.switching = false;
        return;
      }
      await oldPlayProps.episodeCore.destroy();
      this.ensureNotDestroying();
    }
    await this.config.navigate(episodeId, forceReload);
    this.ensureNotDestroying();
    const newEpisodeCore = new EpisodeCore<T>({
      initialEnvVariable: this.envVariable.get(),
      initialAssetStatus: {
        order: assetOrder,
        time: assetTime,
      },
      attemptAutoplay: metadata.attemptAutoplay,
      defaultContentLanguage: metadata.defaultContentLanguage,
      defaultSubtitleLanguage: metadata.defaultSubtitleLanguage,
      episodeId,
    });
    this.internalPlayerProps.set({
      episodeCore: newEpisodeCore,
    });
    this.updateEnvVariable(this.envVariable.get());
    this.updateUserData(this.userData.get());
    this.updateUserImplementedFunction(this.userImplementedFunction.get());
    newEpisodeCore.eventTarget.addEventListener('segmentStart', (event) => {
      this.eventTarget.dispatchEvent(new CustomEvent('segmentStart', {
        detail: {
          episodeId,
          segment: event.detail,
        },
      }));
    });
    newEpisodeCore.eventTarget.addEventListener('segmentEnd', (event) => {
      this.eventTarget.dispatchEvent(new CustomEvent('segmentEnd', {
        detail: {
          episodeId,
          segment: event.detail,
        },
      }));
    });
    newEpisodeCore.eventTarget.addEventListener('end', () => {
      this.eventTarget.dispatchEvent(new CustomEvent('end', {
        detail: {
          episodeId,
        },
      }));
    });
    // Even through the episode data is not ready, episode switching is finished
    // So do not await it here.
    metadata.episodeData.then((data) => {
      newEpisodeCore.initializeEpisode(data);
    });
    this.eventTarget.dispatchEvent(new CustomEvent('initialized', { detail: { episodeId } }));
    this.switching = false;
  };

  private async internalDestroy() {
    const playProps = this.playerProps.get();
    if (playProps !== null) {
      await playProps.episodeCore.destroy();
    }
  }

  private ensureNotDestroying() {
    if (this.destroyPromise !== null) {
      throw new Error('The series core has begin to destroy');
    }
  }

  updateConfig(newConfig: Partial<ISeriesCoreConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  destroy() {
    if (this.destroyPromise === null) {
      this.destroyPromise = this.internalDestroy();
    }
    return this.destroyPromise;
  }
}
