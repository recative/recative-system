import { atom } from 'nanostores';
import { EpisodeCore } from './episodeCore';
import { IDefaultAdditionalEnvVariable } from './manager/envVariable/EnvVariableManager';
import { readonlyAtom } from './utils/nanostore';

export interface SeriesCoreConfig<
  T extends IDefaultAdditionalEnvVariable = IDefaultAdditionalEnvVariable,
>{
  navigate:(episodeId:string, forceReload?:boolean)=>Promise<void>
  getEpisodeMetadata:(episodeId:string)=>Promise<EpisodeMetadata<T>>
}

export interface EpisodeMetadata<
  T extends IDefaultAdditionalEnvVariable = IDefaultAdditionalEnvVariable,
>{
  initialEnvVariable: T;
  attemptAutoplay?: boolean;
  defaultContentLanguage?: string;
  defaultSubtitleLanguage?: string;
}

export interface PlayerProps<
  T extends IDefaultAdditionalEnvVariable = IDefaultAdditionalEnvVariable,
>{
  episodeCore:EpisodeCore<T>
}

export class SeriesCore<T extends IDefaultAdditionalEnvVariable = IDefaultAdditionalEnvVariable> {
  private internalPlayerProps = atom<PlayerProps<T> | null>(null);

  readonly playerProps = readonlyAtom(this.internalPlayerProps);

  private destroyPromise: Promise<void> | null = null;

  private switching: boolean = false;

  constructor(private config:SeriesCoreConfig<T>) {

  }

  setEpisode = async (
    episodeId:string, forceReload?:boolean, assetOrder?:number, assetTime?:number,
  ) => {
    this.ensureNotDestroying();
    if (this.switching) {
      return;
    }
    this.switching = true;
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
    const metadata = await this.config.getEpisodeMetadata(episodeId);
    this.ensureNotDestroying();
    const newEpisodeCore = new EpisodeCore<T>({
      initialEnvVariable: metadata.initialEnvVariable,
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
    this.switching = false;
  };

  private async internalDestroy() {
    const oldPlayProps = this.playerProps.get();
    if (oldPlayProps !== null) {
      await oldPlayProps.episodeCore.destroy();
    }
  }

  private ensureNotDestroying() {
    if (this.destroyPromise !== null) {
      throw new Error('The series core has begin to destroy');
    }
  }

  destroy() {
    if (this.destroyPromise === null) {
      this.destroyPromise = this.internalDestroy();
    }
    return this.destroyPromise;
  }
}
