import { RawUserImplementedFunctions } from '@recative/definitions';
import { atom } from 'nanostores';
import EventTarget from '@ungap/event-target';
import { EpisodeCore } from './episodeCore';
import { IDefaultAdditionalEnvVariable, IUserRelatedEnvVariable } from './manager/envVariable/EnvVariableManager';
import { CustomEventHandler, EpisodeData } from './types';
import { readonlyAtom } from './utils/nanostore';
import { IInitialAssetStatus } from './sequence';

export interface SegmentStartEventDetail {
  episodeId: string,
  segment: number,
}

export interface SegmentEndEventDetail {
  episodeId: string,
  segment: number,
}

export interface EndEventDetail {
  episodeId: string,
}

export interface InitializedEventDetail {
  episodeId: string,
}

export type SeriesCoreEventTarget = EventTarget & {
  addEventListener(type: 'segmentStart', callback: CustomEventHandler<SegmentStartEventDetail>): void,
  addEventListener(type: 'segmentEnd', callback: CustomEventHandler<SegmentEndEventDetail>): void,
  addEventListener(type: 'end', callback: CustomEventHandler<EndEventDetail>): void,
  addEventListener(type: 'initialized', callback: CustomEventHandler<InitializedEventDetail>): void,
};

export interface ISeriesCoreConfig {
  navigate: (episodeId: string, forceReload?: boolean) => Promise<void>;
  getEpisodeMetadata: (
    episodeId: string, assetOrder?: number, assetTime?: number
  ) => IEpisodeMetadata;
}

export interface IEpisodeMetadata {
  initialAssetStatus?: IInitialAssetStatus;
  attemptAutoplay?: boolean;
  defaultContentLanguage?: string;
  defaultSubtitleLanguage?: string;
  episodeData: Promise<EpisodeData> | EpisodeData;
}

export class SeriesCore<T extends IDefaultAdditionalEnvVariable = IDefaultAdditionalEnvVariable> {
  private internalCurrentEpisodeCore = atom<EpisodeCore<T> | null>(null);

  readonly currentEpisodeCore = readonlyAtom<EpisodeCore<T> | null>(
    this.internalCurrentEpisodeCore,
  );

  private destroyPromise: Promise<void> | null = null;

  private switching: boolean = false;

  readonly envVariable = atom<T>({} as T);

  readonly userData = atom<IUserRelatedEnvVariable | undefined>();

  readonly userImplementedFunction = atom<Partial<RawUserImplementedFunctions>>({});

  readonly eventTarget = new EventTarget() as SeriesCoreEventTarget;

  private updateEnvVariable = (envVariable: T) => {
    this.ensureNotDestroying();
    const playProps = this.currentEpisodeCore.get();
    if (playProps !== null) {
      playProps.additionalEnvVariable.set(envVariable);
    }
  };

  private updateUserData = (userData: IUserRelatedEnvVariable | undefined) => {
    this.ensureNotDestroying();
    const playProps = this.currentEpisodeCore.get();
    if (playProps !== null && userData !== undefined) {
      playProps.envVariableManager.userRelatedEnvVariableAtom.set(userData);
    }
  };

  private updateUserImplementedFunction = (
    userImplementedFunction: Partial<RawUserImplementedFunctions>,
  ) => {
    this.ensureNotDestroying();
    const playProps = this.currentEpisodeCore.get();
    if (playProps !== null) {
      playProps.setUserImplementedFunctions(userImplementedFunction);
    }
  };

  constructor(public config: ISeriesCoreConfig) {
    this.envVariable.subscribe(this.updateEnvVariable);
    this.userData.subscribe(this.updateUserData);
    this.userImplementedFunction.subscribe(this.updateUserImplementedFunction);
  }

  setEpisode = async (
    episodeId: string, forceReload?: boolean, assetOrder?: number, assetTime?: number,
  ) => {
    this.ensureNotDestroying();
    if (this.switching) {
      return this.currentEpisodeCore.get();
    }
    this.switching = true;
    const metadata = this.config.getEpisodeMetadata(episodeId, assetOrder, assetTime);
    const oldEpisodeCore = this.currentEpisodeCore.get();
    if (oldEpisodeCore !== null) {
      if (oldEpisodeCore.episodeId === episodeId) {
        oldEpisodeCore.seek(
          metadata.initialAssetStatus?.order ?? 0,
          metadata.initialAssetStatus?.time ?? 0,
        );
        this.switching = false;
        return oldEpisodeCore;
      }
      await oldEpisodeCore.destroy();
      this.ensureNotDestroying();
    }
    await this.config.navigate(episodeId, forceReload);
    this.ensureNotDestroying();
    const newEpisodeCore = new EpisodeCore<T>({
      initialEnvVariable: this.envVariable.get(),
      initialAssetStatus: metadata.initialAssetStatus,
      attemptAutoplay: metadata.attemptAutoplay,
      defaultContentLanguage: metadata.defaultContentLanguage,
      defaultSubtitleLanguage: metadata.defaultSubtitleLanguage,
      episodeId,
    });
    this.internalCurrentEpisodeCore.set(newEpisodeCore);
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
    Promise.resolve(metadata.episodeData).then((data) => {
      newEpisodeCore.initializeEpisode(data);
    });
    this.eventTarget.dispatchEvent(new CustomEvent('initialized', { detail: { episodeId } }));
    this.switching = false;
    return this.currentEpisodeCore.get();
  };

  private async internalDestroy() {
    const playProps = this.currentEpisodeCore.get();
    if (playProps !== null) {
      await playProps.destroy();
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
