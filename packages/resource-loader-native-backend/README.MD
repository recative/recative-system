# resource-loader-native-backend

ResourceLoader

## Install

```bash
npm install resource-loader-native-backend
npx cap sync
```

## API

<docgen-index>

* [`queryFile(...)`](#queryfile)
* [`fetchFile(...)`](#fetchfile)
* [`deleteFile(...)`](#deletefile)
* [`deleteFileByIds(...)`](#deletefilebyids)
* [`test()`](#test)
* [`testError()`](#testerror)
* [`addListener('onComplete', ...)`](#addlisteneroncomplete)
* [`addListener('onError', ...)`](#addlisteneronerror)
* [`removeAllListeners()`](#removealllisteners)
* [`unZip(...)`](#unzip)
* [`ls(...)`](#ls)
* [Interfaces](#interfaces)
* [Type Aliases](#type-aliases)

</docgen-index>

<docgen-api>
<!--Update the source file JSDoc comments and rerun docgen to update the docs below-->

### queryFile(...)

```typescript
queryFile(options: IFetchFileOption) => Promise<IFetchFileResponse>
```

query file state

| Param         | Type                                                          |
| ------------- | ------------------------------------------------------------- |
| **`options`** | <code><a href="#ifetchfileoption">IFetchFileOption</a></code> |

**Returns:** <code>Promise&lt;<a href="#ifetchfileresponse">IFetchFileResponse</a>&gt;</code>

--------------------


### fetchFile(...)

```typescript
fetchFile(options: IFetchFileOption) => Promise<IFetchFileResponse>
```

Fetch a file from remote server.
* if the file has not been fetched, the file will start to be downloaded,
  and the return value won't have a `location_uri`;
* If the file has already been downloaded, we'll return a value with
  `location_uri`.

| Param         | Type                                                          |
| ------------- | ------------------------------------------------------------- |
| **`options`** | <code><a href="#ifetchfileoption">IFetchFileOption</a></code> |

**Returns:** <code>Promise&lt;<a href="#ifetchfileresponse">IFetchFileResponse</a>&gt;</code>

--------------------


### deleteFile(...)

```typescript
deleteFile(options: IDeleteFileOption) => Promise<void>
```

Remove a file, or a directory.

| Param         | Type                                                            |
| ------------- | --------------------------------------------------------------- |
| **`options`** | <code><a href="#ideletefileoption">IDeleteFileOption</a></code> |

--------------------


### deleteFileByIds(...)

```typescript
deleteFileByIds(options: IDeleteFileByIdOption) => Promise<IDeleteFileByIdResponse>
```

Remove a file, by providing the id of this file.

| Param         | Type                                                                    |
| ------------- | ----------------------------------------------------------------------- |
| **`options`** | <code><a href="#ideletefilebyidoption">IDeleteFileByIdOption</a></code> |

**Returns:** <code>Promise&lt;<a href="#ideletefilebyidresponse">IDeleteFileByIdResponse</a>&gt;</code>

--------------------


### test()

```typescript
test() => Promise<void>
```

Trigger a file download task.

--------------------


### testError()

```typescript
testError() => Promise<void>
```

Trigger a file download error.

--------------------


### addListener('onComplete', ...)

```typescript
addListener(event: 'onComplete', func: FileDownloadListener) => Promise<PluginListenerHandle> & PluginListenerHandle
```

A listener for successfully downloaded task.

| Param       | Type                                                                  |
| ----------- | --------------------------------------------------------------------- |
| **`event`** | <code>'onComplete'</code>                                             |
| **`func`**  | <code><a href="#filedownloadlistener">FileDownloadListener</a></code> |

**Returns:** <code>Promise&lt;<a href="#pluginlistenerhandle">PluginListenerHandle</a>&gt; & <a href="#pluginlistenerhandle">PluginListenerHandle</a></code>

--------------------


### addListener('onError', ...)

```typescript
addListener(event: 'onError', func: ErrorListener) => Promise<PluginListenerHandle> & PluginListenerHandle
```

A listener for tasks that failed.

| Param       | Type                                                    |
| ----------- | ------------------------------------------------------- |
| **`event`** | <code>'onError'</code>                                  |
| **`func`**  | <code><a href="#errorlistener">ErrorListener</a></code> |

**Returns:** <code>Promise&lt;<a href="#pluginlistenerhandle">PluginListenerHandle</a>&gt; & <a href="#pluginlistenerhandle">PluginListenerHandle</a></code>

--------------------


### removeAllListeners()

```typescript
removeAllListeners() => Promise<void>
```

Remove all event listeners.

--------------------


### unZip(...)

```typescript
unZip(id: IUnZipOption) => Promise<IUnZipResponse>
```

unzip file
The file of special id must be a zip file

| Param    | Type                                                  |
| -------- | ----------------------------------------------------- |
| **`id`** | <code><a href="#iunzipoption">IUnZipOption</a></code> |

**Returns:** <code>Promise&lt;<a href="#iunzipresponse">IUnZipResponse</a>&gt;</code>

--------------------


### ls(...)

```typescript
ls(directory: ILSOption) => Promise<ILSResponse>
```

List all files in special folder
The root directory equals root directory of unzip

| Param           | Type                                            |
| --------------- | ----------------------------------------------- |
| **`directory`** | <code><a href="#ilsoption">ILSOption</a></code> |

**Returns:** <code>Promise&lt;<a href="#ilsresponse">ILSResponse</a>&gt;</code>

--------------------


### Interfaces


#### IFetchFileResponse

| Prop       | Type                               | Description       |
| ---------- | ---------------------------------- | ----------------- |
| **`data`** | <code>IFileDownloadResult[]</code> | Tasks that valid. |
| **`skip`** | <code>IDownloadTask[]</code>       | Invalid tasks.    |


#### IFileDownloadResult

The result of download file

| Prop         | Type                                                              | Description          |
| ------------ | ----------------------------------------------------------------- | -------------------- |
| **`file`**   | <code><a href="#ifiledownloadmodel">IFileDownloadModel</a></code> | Model of file        |
| **`status`** | <code><a href="#itaskstatus">ITaskStatus</a></code>               | Status for this file |


#### IFileDownloadModel

Model for Download file

| Prop               | Type                | Description                             |
| ------------------ | ------------------- | --------------------------------------- |
| **`id`**           | <code>string</code> | The task ID we have just defined.       |
| **`location_uri`** | <code>string</code> | The file URI on your local file system. |


#### ITaskStatus

The status model for IDownloadFileTask

| Prop          | Type                | Description                                                                                                                                                                                                                                                                                                                                     |
| ------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`code`**    | <code>number</code> | less than 0: error more than 0: running but not complete yet 0:success 1:pendding 2:downloading -1:download manager error -2:md5 hash error -3:source uri different with download uri when same id -4:download complete but file not exists maybe deleted by user -6:Task not create yet!Ensure you have called fetchFile() before queryFile()! |
| **`message`** | <code>string</code> | description for this status if failed                                                                                                                                                                                                                                                                                                           |
| **`total`**   | <code>number</code> | Total size of the download in bytes. If no fetch the size of file this value is -1                                                                                                                                                                                                                                                              |
| **`current`** | <code>number</code> | Number of bytes download so far If no fetch the size of file this value is 0                                                                                                                                                                                                                                                                    |


#### IDownloadTask

A download task.

| Prop           | Type                | Description                                                                                                                                                           |
| -------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`id`**       | <code>string</code> | A unique id of this download task.                                                                                                                                    |
| **`md5`**      | <code>string</code> | The MD5 hash of this file, if this value is provided, a checksum will be performed, if the md5 hash of the downloaded file didn't match, the download task will fail. |
| **`uri`**      | <code>string</code> | The URL of this file, if not provided, and the task with some `id` has never been triggered, the task will be skipped.                                                |
| **`location`** | <code>string</code> | The destination path of this file, relative to a root path defined by your system.                                                                                    |


#### IFetchFileOption

| Prop        | Type                         | Description         |
| ----------- | ---------------------------- | ------------------- |
| **`files`** | <code>IDownloadTask[]</code> | All fetching tasks. |


#### IDeleteFileOption

| Prop        | Type                  | Description                   |
| ----------- | --------------------- | ----------------------------- |
| **`files`** | <code>string[]</code> | AbsolutePath for delete files |


#### IDeleteFileByIdResponse

| Prop       | Type                  | Description          |
| ---------- | --------------------- | -------------------- |
| **`skip`** | <code>string[]</code> | File IDs that skiped |


#### IDeleteFileByIdOption

A remove file task.

| Prop      | Type                  | Description                       |
| --------- | --------------------- | --------------------------------- |
| **`ids`** | <code>string[]</code> | File IDs that need to be removed. |


#### PluginListenerHandle

| Prop         | Type                                      |
| ------------ | ----------------------------------------- |
| **`remove`** | <code>() =&gt; Promise&lt;void&gt;</code> |


#### IErrorResponse

If the download task failed, this response will be returned.

| Prop          | Type                | Description                                  |
| ------------- | ------------------- | -------------------------------------------- |
| **`code`**    | <code>number</code> | Error code: * Insufficient disk space: `-10` |
| **`message`** | <code>string</code> | Human friendly error message.                |


#### IUnZipResponse

response message

| Prop         | Type                |
| ------------ | ------------------- |
| **`result`** | <code>string</code> |


#### IUnZipOption

un zip option

| Prop           | Type                | Description                                   |
| -------------- | ------------------- | --------------------------------------------- |
| **`path`**     | <code>string</code> | id you want to unzip                          |
| **`location`** | <code>string</code> | location of root folder if not equal filename |


#### ILSResponse

response for LS request

| Prop        | Type                                 |
| ----------- | ------------------------------------ |
| **`files`** | <code>IFileDescriptionModel[]</code> |


#### IFileDescriptionModel

Model for description of file

| Prop              | Type                 |
| ----------------- | -------------------- |
| **`fileName`**    | <code>string</code>  |
| **`isDirectory`** | <code>boolean</code> |


#### ILSOption

list files of speacial directory
path support 
/:list all files in root directory
/folder:list all files in '/folder' directory

| Prop       | Type                |
| ---------- | ------------------- |
| **`path`** | <code>string</code> |


### Type Aliases


#### FetchResultUnit

<code><a href="#ifiledownloadresult">IFileDownloadResult</a></code>


#### FileDownloadListener

<code>(response: <a href="#ifiledownloadresult">IFileDownloadResult</a>): void</code>


#### ErrorListener

<code>(response: <a href="#ierrorresponse">IErrorResponse</a>): void</code>

</docgen-api>
