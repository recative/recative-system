import { WebPlugin } from '@capacitor/core';

import type { AnalysisPlugin, IAccountRequest, IAuthorizedRequest, IPropertiesAppendRequest, IPropertiesSetRequest, IResultResponse, ITrackRequest, IUserPropertiesDeleteRequest } from './definitions';

export class ExampleWeb extends WebPlugin implements AnalysisPlugin {
  initSdk(options: IAuthorizedRequest): Promise<void> {
      throw new Error('Method not implemented.');
  }
  getDistinctId(): Promise<IResultResponse> {
      throw new Error('Method not implemented.');
  }
  setDistinctId(options: IAccountRequest): Promise<void> {
      throw new Error('Method not implemented.');
  }
  signIn(options: IAccountRequest): Promise<void> {
      throw new Error('Method not implemented.');
  }
  signOut(): Promise<void> {
      throw new Error('Method not implemented.');
  }
  track(options: ITrackRequest): Promise<void> {
      throw new Error('Method not implemented.');
  }
  setPublicProperties(options: IPropertiesSetRequest): Promise<void> {
      throw new Error('Method not implemented.');
  }
  unsetPublicProperties(option: IPropertiesSetRequest): Promise<void> {
      throw new Error('Method not implemented.');
  }
  clearPublicProperties(): Promise<void> {
      throw new Error('Method not implemented.');
  }
  getPublicProperties(): Promise<IPropertiesSetRequest> {
      throw new Error('Method not implemented.');
  }
  eventStart(event: ITrackRequest): Promise<void> {
      throw new Error('Method not implemented.');
  }
  eventEnd(options: ITrackRequest): Promise<void> {
      throw new Error('Method not implemented.');
  }
  userSet(option: IPropertiesSetRequest): Promise<void> {
      throw new Error('Method not implemented.');
  }
  userSetOnce(option: IPropertiesSetRequest): Promise<void> {
      throw new Error('Method not implemented.');
  }
  userAdd(option: IPropertiesSetRequest): Promise<void> {
      throw new Error('Method not implemented.');
  }
  userUnSet(option: IUserPropertiesDeleteRequest): Promise<void> {
      throw new Error('Method not implemented.');
  }
  userDelete(): Promise<void> {
      throw new Error('Method not implemented.');
  }
  userAppend(option: IPropertiesAppendRequest): Promise<void> {
      throw new Error('Method not implemented.');
  }
  userUniqAppend(option: IPropertiesAppendRequest): Promise<void> {
      throw new Error('Method not implemented.');
  }
  getDeviceId(): Promise<IResultResponse> {
      throw new Error('Method not implemented.');
  }
  async echo(options: { value: string }): Promise<{ value: string }> {
    console.log('ECHO', options);
    return options;
  }
}
