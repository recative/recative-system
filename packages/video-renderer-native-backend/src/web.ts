import { WebPlugin } from '@capacitor/core';

import type {ICancelTaskRequest,IFinalizeRequest, IFinalizeResponse, VideoRendererPlugin, VideoRendererTaskProps } from './definitions';

export class VideoRendererWeb extends WebPlugin implements VideoRendererPlugin {
  async createTask(options: VideoRendererTaskProps): Promise<void> {
    console.log('createQueue', options);
    throw new Error('Method not implemented.');
  }
  async finalize(options:IFinalizeRequest): Promise<IFinalizeResponse> {
    console.log('finalize', options);
    throw new Error('Method not implemented.');
  }
  async echo(options: { value: string }): Promise<{ value: string }> {
    console.log('ECHO', options);
    return options;
  }
  async cancelTask(options:ICancelTaskRequest): Promise<void>{
    console.log('cancel',options);
    throw new Error('Method not implemented.');
  }
}
