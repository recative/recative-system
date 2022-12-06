import type { PluginListenerHandle } from '@capacitor/core';

/**
 * A download task.
 */
export interface IDownloadTask {
  /**
   * A unique id of this download task.
   */
  id: string;
  /**
   * The MD5 hash of this file, if this value is provided, a checksum will
   * be performed, if the md5 hash of the downloaded file didn't match,
   * the download task will fail.
   */
  md5?: string;
  /**
   * The URL of this file, if not provided, and the task with some `id` has
   * never been triggered, the task will be skipped.
   */
  uri?: string;
  /**
   * The destination path of this file, relative to a root path defined by
   * your system.
   */
  location?: string;
}

/**
 * The result of download file
 */
export interface IFileDownloadResult {
  /**
   * Model of file
   */
  file: IFileDownloadModel;
  /**
   * Status for this file
   */
  status: ITaskStatus;
}

/**
 * Model for Download file
 */
export interface IFileDownloadModel {
  /**
   * The task ID we have just defined.
   */
  id: string;
  /**
   * The file URI on your local file system.
   */
  location_uri?: string;
}

/**
 * The status model for IDownloadFileTask
 */
export interface ITaskStatus {
  /**
   * less than 0: error
   * more than 0: running but not complete yet
   * 0:success
   * 1:pendding
   * 2:downloading
   * -1:download manager error
   * -2:md5 hash error
   * -3:source uri different with download uri when same id
   * -4:download complete but file not exists maybe deleted by user
   * -6:Task not create yet!Ensure you have called fetchFile() before queryFile()!
   */
  code: number;
  /**
   * description for this status if failed
   */
  message?: string;

  /**
   * Total size of the download in bytes.
   * If no fetch the size of file this value is -1
   */
  total: number;

  /**
   * Number of bytes download so far
   * If no fetch the size of file this value is 0
   */
  current: number;
}

export interface IFetchFileOption {
  /**
   * All fetching tasks.
   */
  files: IDownloadTask[];
}
/**
 * response for query file state
 */
export interface IQueryFileResponse {
  data: FetchResultUnit[];
}
export interface IFetchFileResponse {
  /**
   * Tasks that valid.
   */
  data: FetchResultUnit[];
  /**
   * Invalid tasks.
   */
  skip: IDownloadTask[];
}

export interface IDeleteFileOption {
  /**
   * AbsolutePath for delete files
   */
  files: string[];
}

/**
 * A remove file task.
 */
interface IDeleteFileByIdOption {
  /**
   * File IDs that need to be removed.
   */
  ids: string[];
}

export type FetchResultUnit = IFileDownloadResult;

interface IDeleteFileByIdResponse {
  /**
   * File IDs that skiped
   */
  skip: string[];
}

/**
 * If the download task failed, this response will be returned.
 */
export interface IErrorResponse {
  /**
   * Error code:
   * * Insufficient disk space: `-10`
   */
  code: number;
  /**
   * Human friendly error message.
   */
  message: string;
}

/**
 * Model for description of file
 */
export interface IFileDescriptionModel {
  fileName: string;

  isDirectory: boolean;
}
/**
 * un zip option
 */
export interface IUnZipOption {
  /**
   * id you want to unzip
   */
  path: string;
  /**
   * location of root folder if not equal filename
   */
  location?: string;
}
/**
 * response message
 */
export interface IUnZipResponse {
  result: string;
}
/**
 * list files of speacial directory
 * path support
 * /:list all files in root directory
 * /folder:list all files in '/folder' directory
 */
export interface ILSOption {
  path: string;
}
/**
 * response for LS request
 */
export interface ILSResponse {
  files: IFileDescriptionModel[];
}

export type FileDownloadListener = (response: IFileDownloadResult) => void;
export type ErrorListener = (response: IErrorResponse) => void;

/**
 * Returned By `addListener`, you can remove the listener via this handler.
 */
export interface IPluginListenerHandle {
  /**
   * Remove the event listener.
   */
  remove: () => Promise<void>;
}
export interface ResourceLoaderPlugin {
  /**
   * query file state
   * @param options
   */
  queryFile(options: IFetchFileOption): Promise<IFetchFileResponse>;
  /**
   * Fetch a file from remote server.
   * * if the file has not been fetched, the file will start to be downloaded,
   *   and the return value won't have a `location_uri`;
   * * If the file has already been downloaded, we'll return a value with
   *   `location_uri`.
   */
  fetchFile(options: IFetchFileOption): Promise<IFetchFileResponse>;
  /**
   * Remove a file, or a directory.
   */
  deleteFile(options: IDeleteFileOption): Promise<void>;
  /**
   * Remove a file, by providing the id of this file.
   */
  deleteFileByIds(
    options: IDeleteFileByIdOption,
  ): Promise<IDeleteFileByIdResponse>;
  /**
   * Trigger a file download task.
   */
  test(): Promise<void>;
  /**
   * Trigger a file download error.
   */
  testError(): Promise<void>;
  /**
   * A listener for successfully downloaded task.
   */
  addListener(
    event: 'onComplete',
    func: FileDownloadListener,
  ): Promise<PluginListenerHandle> & PluginListenerHandle;
  /**
   * A listener for tasks that failed.
   */
  addListener(
    event: 'onError',
    func: ErrorListener,
  ): Promise<PluginListenerHandle> & PluginListenerHandle;
  /**
   * Remove all event listeners.
   */
  removeAllListeners(): Promise<void>;

  /**
   * unzip file
   * The file of special id must be a zip file
   */
  unZip(id: IUnZipOption): Promise<IUnZipResponse>;

  /**
   * List all files in special folder
   * The root directory equals root directory of unzip
   */
  ls(directory: ILSOption): Promise<ILSResponse>;
}
