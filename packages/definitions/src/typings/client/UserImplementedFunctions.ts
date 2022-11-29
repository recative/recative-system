import { RawUserImplementedFunctions, GoToEpisode } from "./player";


export type UserImplementedFunctions = Omit<RawUserImplementedFunctions, "gotoEpisode"> & {
  gotoEpisode: GoToEpisode;
};
