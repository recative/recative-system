import EventTarget from '@ungap/event-target';
import { atom } from 'nanostores';
import type { RawUserImplementedFunctions } from '@recative/definitions';

import { EpisodeCore } from './episodeCore';
import { readonlyAtom } from './utils/nanostore';
import type { IInitialAssetStatus } from './sequence';
import type { CustomEventHandler, EpisodeData } from './types';
import type {
  IUserRelatedEnvVariable,
  IDefaultAdditionalEnvVariable,
} from './manager/envVariable/EnvVariableManager';

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
  ) => IEpisodeMetadata | Promise<IEpisodeMetadata>;
}

export interface IEpisodeMetadata {
  initialAssetStatus?: IInitialAssetStatus;
  attemptAutoplay?: boolean;
  defaultContentLanguage?: string;
  defaultSubtitleLanguage?: string;
  episodeData: EpisodeData;
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
    const episodeCore = this.currentEpisodeCore.get();
    if (episodeCore !== null) {
      episodeCore.additionalEnvVariable.set(envVariable);
    }
  };

  private updateUserData = (userData: IUserRelatedEnvVariable | undefined) => {
    this.ensureNotDestroying();
    const episodeCore = this.currentEpisodeCore.get();
    if (episodeCore !== null && userData !== undefined) {
      episodeCore.envVariableManager.userRelatedEnvVariableAtom.set(userData);
    }
  };

  private updateUserImplementedFunction = (
    userImplementedFunction: Partial<RawUserImplementedFunctions>,
  ) => {
    this.ensureNotDestroying();
    const episodeCore = this.currentEpisodeCore.get();
    if (episodeCore !== null) {
      if (episodeCore.coreState.get() !== 'destroyed') {
        episodeCore.setUserImplementedFunctions(userImplementedFunction);
      }
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
    const metadataPromise = this.config.getEpisodeMetadata(episodeId, assetOrder, assetTime);
    const oldEpisodeCore = this.currentEpisodeCore.get();
    if (oldEpisodeCore !== null) {
      if (oldEpisodeCore.episodeId === episodeId) {
        const metadata = await metadataPromise;
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
    const metadata = await metadataPromise;
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
    newEpisodeCore.initializeEpisode(metadata.episodeData);
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
