/**
 * init configuration
 */
export interface IAuthorizedRequest {
  /**
   * app Id not null
   */
  appId: string;

  /**
   * url for the server that report data
   */
  serverUrl: string;
}
/**
 * Request for track
 */
export interface ITrackRequest {
  eventName: string;
  /**
   * other key and value for track
   */
  [key: string]: unknown;
}
/**
 * Public properties
 */
export interface IPropertiesSetRequest {
  /**
   * key and value for properties
   */
  [key: string]: unknown;
}
/**
 * Append value on exists properties
 */
export interface IPropertiesAppendRequest {
  [key: string]: string[];
}
/**
 * Response all exists properties
 */
export interface IPropertiesResponse {
  [key: string]: unknown;
}
/**
 * Set account
 */
export interface IAccountRequest {
  id: string;
}
/**
 * Delete a public property
 */
export interface IPublicPropertiesDeleteRequest {
  // key of delete
  key: string;
}
/**
 * Delete user property
 */
export interface IUserPropertiesDeleteRequest {
  // keys of delete
  keys: string[];
}
/**
 * Common response
 */
export interface IResultResponse {
  result: string;
}

export interface AnalysisPlugin {
  /**
   * init all config
   * @param options
   * @link https://docs.thinkingdata.cn/ta-manual/latest/installation/installation_menu/client_sdk/android_sdk_installation/android_sdk_installation.html#_1-3-%E5%88%9D%E5%A7%8B%E5%8C%96-sdk
   */
  initSdk(options: IAuthorizedRequest): Promise<void>;
  /**
   * get current anonymous id
   */
  getDistinctId(): Promise<IResultResponse>;
  /**
   * set current anonymous id
   * @param id
   * @link https://docs.thinkingdata.cn/ta-manual/latest/installation/installation_menu/client_sdk/android_sdk_installation/android_sdk_installation.html#_2-1-%E8%AE%BE%E7%BD%AE%E8%AE%BF%E5%AE%A2-id-%E5%8F%AF%E9%80%89
   */
  setDistinctId(options: IAccountRequest): Promise<void>;
  /**
   * set account
   * @param options
   * @link https://docs.thinkingdata.cn/ta-manual/latest/installation/installation_menu/client_sdk/android_sdk_installation/android_sdk_installation.html#_2-2-%E8%AE%BE%E7%BD%AE%E8%B4%A6%E5%8F%B7-id
   */
  signIn(options: IAccountRequest): Promise<void>;
  /**
   * clear current account
   * @link https://docs.thinkingdata.cn/ta-manual/latest/installation/installation_menu/client_sdk/android_sdk_installation/android_sdk_installation.html#_2-3-%E6%B8%85%E9%99%A4%E8%B4%A6%E5%8F%B7-id
   */
  signOut(): Promise<void>;

  /**
   * track event
   * @param eventName
   * @param options
   * @link https://docs.thinkingdata.cn/ta-manual/latest/installation/installation_menu/client_sdk/android_sdk_installation/android_sdk_installation.html#_3-1-%E5%8F%91%E9%80%81%E4%BA%8B%E4%BB%B6
   */
  track(options: ITrackRequest): Promise<void>;
  /**
   * set public properties
   * @param options
   * @link https://docs.thinkingdata.cn/ta-manual/latest/installation/installation_menu/client_sdk/android_sdk_installation/android_sdk_installation.html#_3-2-%E8%AE%BE%E7%BD%AE%E5%85%AC%E5%85%B1%E4%BA%8B%E4%BB%B6%E5%B1%9E%E6%80%A7
   */
  setPublicProperties(options: IPropertiesSetRequest): Promise<void>;
  /**
   * delete special public property
   * @param option
   */
  unsetPublicProperties(option: IPropertiesSetRequest): Promise<void>;
  /**
   * clear all public properties
   */
  clearPublicProperties(): Promise<void>;
  /**
   * get all public properties
   */
  getPublicProperties(): Promise<IPropertiesSetRequest>;

  /**
   * track event and start timing
   * @param eventName
   * @link https://docs.thinkingdata.cn/ta-manual/latest/installation/installation_menu/client_sdk/android_sdk_installation/android_sdk_installation.html#_3-4-%E8%AE%B0%E5%BD%95%E4%BA%8B%E4%BB%B6%E6%97%B6%E9%95%BF
   */
  eventStart(event: ITrackRequest): Promise<void>;
  /**
   * end timing and track event
   * @param options
   */
  eventEnd(options: ITrackRequest): Promise<void>;

  /**
   * set properties for user
   * @param option
   * @link https://docs.thinkingdata.cn/ta-manual/latest/installation/installation_menu/client_sdk/android_sdk_installation/android_sdk_installation.html#_4-1-user-set
   */
  userSet(option: IPropertiesSetRequest): Promise<void>;
  /**
   * set properties only track once
   * @param option
   * @link https://docs.thinkingdata.cn/ta-manual/latest/installation/installation_menu/client_sdk/android_sdk_installation/android_sdk_installation.html#_4-2-user-setonce
   */
  userSetOnce(option: IPropertiesSetRequest): Promise<void>;
  /**
   * When you want to upload a numeric attribute, you can call userAdd to accumulate the attribute.
   * If the attribute has not been set, a value of 0 will be assigned before calculation.
   * Negative values can be passed in, which is equivalent to subtraction operations.
   * @param option
   * @link https://docs.thinkingdata.cn/ta-manual/latest/installation/installation_menu/client_sdk/android_sdk_installation/android_sdk_installation.html#_4-3-user-add
   */
  userAdd(option: IPropertiesSetRequest): Promise<void>;
  /**
   * When you want to empty the user feature value of the user, you can use userUnSet to empty the specified attribute.
   * If the attribute has not been created in the cluster, userUnSet **will not **create the attribute.
   * @param option
   * @link https://docs.thinkingdata.cn/ta-manual/latest/installation/installation_menu/client_sdk/android_sdk_installation/android_sdk_installation.html#_4-4-user-unset
   */
  userUnSet(option: IUserPropertiesDeleteRequest): Promise<void>;
  /**
   * If you want to delete a user, you can call userDelete to delete the user.
   * You will no longer be able to query the user features of the user, but the events generated by the user can still be queried.
   * @link https://docs.thinkingdata.cn/ta-manual/latest/installation/installation_menu/client_sdk/android_sdk_installation/android_sdk_installation.html#_4-4-user-unset
   */
  userDelete(): Promise<void>;
  /**
   * append to user features of type JSONArray.
   * @param option
   * @link https://docs.thinkingdata.cn/ta-manual/latest/installation/installation_menu/client_sdk/android_sdk_installation/android_sdk_installation.html#_4-6-user-append
   */
  userAppend(option: IPropertiesAppendRequest): Promise<void>;
  /**
   * append to user features of type JSONArray and distinct them
   * @param option
   * @link https://docs.thinkingdata.cn/ta-manual/latest/installation/installation_menu/client_sdk/android_sdk_installation/android_sdk_installation.html#_4-7-user-uniqappend
   */
  userUniqAppend(option: IPropertiesAppendRequest): Promise<void>;
  /**
   * get the id of this device
   * @link https://docs.thinkingdata.cn/ta-manual/latest/installation/installation_menu/client_sdk/android_sdk_installation/android_sdk_installation.html#_6-3-%E8%8E%B7%E5%8F%96%E8%AE%BE%E5%A4%87-id
   */
  getDeviceId(): Promise<IResultResponse>;
}
