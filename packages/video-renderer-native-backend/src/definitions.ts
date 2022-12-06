import { PluginListenerHandle } from "@capacitor/core";

/**
 *  Response of Finalize the video renderer task
 */
export interface IFinalizeResponse{
  status:IStatus;
  renderTask:VideoRenderTaskBody;
}
/**
 * information of video render task
 */
export interface VideoRenderTaskBody{

  renderTaskId:string;
  /**
   * uri of output file
   */
  url:string;
}

export interface VideoRendererPlugin {

  /**
   * create a render async task and start it
   * @param option 
   */

  createTask(option: VideoRendererTaskProps): Promise<void>;
  /**
  * 
  * Combine all small videos and audio into one video
  */
  finalize(option: IFinalizeRequest): Promise<IFinalizeResponse>;
  /**
   * This listener will receive all message when status of change
   * @param event 
   * @param func 
   */
  addListener(
    event: 'renderTaskComplete',
    func: RenderCompileListener,
  ): Promise<PluginListenerHandle> & PluginListenerHandle;

  removeAllListeners(): Promise<void>;
    /**
     * cancel special renderTask
     * this method will delete all files of the task
     * @param option 
     */
  cancelTask(option:ICancelTaskRequest): Promise<void>;

}
export type RenderCompileListener = (response: IFinalizeResponse) => void;
/**
 * request your want to finalize
 */
export interface IFinalizeRequest {
  /**
   * task id
   */
  renderTaskId: string
}
/**
 * request your want to cancel
 */
export interface ICancelTaskRequest {
  renderTaskId: string
}

export interface IStatus {
  /**
   * 0:successul;1:rendering;loess 0: any error
   */
  status: number;
  /**
   * description for task 
   * empty when success
   */
  message: string;
}
export interface VideoRendererTaskProps {
  renderTaskId?: string;
  resolution: [number, number];
  /**
   * output fps default is 30
   */
  fps?: number;
  /**
   * output file name
   */
  outputFileName: string;
  /**
  * audio file name
  */
  audioFileName?: string
}