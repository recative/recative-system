package tv.jbcz.resourceloader

import android.app.DownloadManager
import android.content.Context
import android.os.Environment
import android.text.TextUtils
import android.util.Log
import androidx.core.net.toFile
import androidx.core.net.toUri
import tv.jbcz.resourceloader.database.FileEntity
import tv.jbcz.resourceloader.database.FileInfoDao
import java.io.File

class FileDownloadRepository(context: Context) {
    companion object{
        @JvmStatic
        private val TAG:String = "DownloadManager"
    }
    val downloadManager: DownloadManager by lazy {
        context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
    }
    val fileDao: FileInfoDao by lazy {
        FileInfoDao(context)
    }
    val directory: File by lazy {
        File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "external")
    }
    val rootDirectory : File? by lazy {
        context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)
    }
    fun deleteFileById(resourceId: String) {
        fileDao.queryByResourceId(resourceId)?.last()?.run {
            queryFromDownloadManager(this.downloadmanager_id)?.second?.delete()
        }
    }

    /**
     * return file if download successful
     */
    fun queryFromDownloadManager(id: Long) =
        DownloadManager.Query().apply { setFilterById(id) }?.let { query ->
            downloadManager.query(query)
                ?.takeIf { it.moveToNext() }
                ?.takeIf { it.getInt(it.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS)) == DownloadManager.STATUS_SUCCESSFUL }
                ?.let {
                    var hash = it.getString(it.getColumnIndex(DownloadManager.COLUMN_DESCRIPTION))
                    var sourceUri = it.getString(it.getColumnIndex(DownloadManager.COLUMN_URI))
                    var localUri = it.getString(it.getColumnIndex(DownloadManager.COLUMN_LOCAL_URI))
                    var reason = it.getString(it.getColumnIndex(DownloadManager.COLUMN_REASON))
                    Log.i(TAG, "${sourceUri} ${localUri}")
                    fileDao.queryByDownloadId(id)?.resourceId to localUri.toUri().toFile()
                        ?.takeIf { f -> f.exists() }
                }
        }

    private fun queryDownloadManagerId(resourceId: String) =
        fileDao.queryByResourceId(resourceId)?.last()
            ?.let { DownloadManager.Query().apply { setFilterById(it.downloadmanager_id) } }
            ?.let { downloadManager.query(it) }?.takeIf { c -> c != null && c.moveToNext() }

    fun queryFileState(
        resourceId: String,
        downloadUri: String,
        mHash: String? = null,
        location: String? = null
    ): DataFile {
        var cursor = queryDownloadManagerId(resourceId)
        var dataFile = DataFile(resourceId)

        dataFile.statusCode = if (cursor != null) 1 else -6
        dataFile.reason = if (cursor !=null) "" else "Task not ceated yet"

        if (cursor != null) {
            var sourceUri = cursor.getString(cursor.getColumnIndex(DownloadManager.COLUMN_URI))
            var localUri = cursor.getString(cursor.getColumnIndex(DownloadManager.COLUMN_LOCAL_URI))
            var reason = cursor.getString(cursor.getColumnIndex(DownloadManager.COLUMN_REASON))
            var status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))
            var total = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES))
            var current = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR))
            dataFile.total = total
            dataFile.current = current
            dataFile.reason = reason
            dataFile.statusCode = when (status) {
                DownloadManager.STATUS_PENDING -> 2
                DownloadManager.STATUS_RUNNING -> 2
                DownloadManager.STATUS_PAUSED -> 2
                DownloadManager.STATUS_SUCCESSFUL -> {
                    var file = localUri.toUri().toFile()
                    if (!file.exists()) {
                        dataFile.reason="File is not exists"
                        -4
                    } else {
                        var code = if (!TextUtils.isEmpty(mHash)) {
                            var fileHash = file.toBigMd5()
                            if (mHash == fileHash) {
                                0
                            } else {
                                dataFile.reason =
                                    "md5 hash error accept:${mHash},hash of file:${fileHash}"
                                -2
                            }
                        } else {
                            if (downloadUri == sourceUri) {
                                0
                            } else {
                                dataFile.reason =
                                    "source uri changed:accept:${downloadUri},source:${sourceUri}"
                                -3
                            }
                        }
                        if (code == 0)
                            dataFile.file = file
                        code
                    }
                }
                DownloadManager.STATUS_FAILED -> {
                    dataFile.reason = reason
                    -1
                }
                else -> -10
            }
        }
        return dataFile
    }

    fun fetchFileById(
        resourceId: String,
        downloadUri: String,
        mHash: String? = null,
        location: String? = null
    ): DataFile = queryFileState(resourceId, downloadUri, mHash, location)
        .also {
            if (it.statusCode == -6) {
                var id = insertDownloadManager(downloadUri, mHash, location)
                insertDatabase(resourceId, downloadUri, id, mHash, location)
                var result = queryFileState(resourceId,downloadUri,mHash,location)
                it.file=result.file
                it.statusCode = result.statusCode
                it.reason = result.reason
                it.current = result.current
                it.total = result.total
                it.resourceId = result.resourceId
            } else if (it.statusCode > 0) {

            } else if (it.statusCode < 0) {
                it.file?.takeIf { it.exists() }?.run {
                    delete()
                }
                var id = insertDownloadManager(downloadUri, mHash, location)
                insertDatabase(resourceId, downloadUri, id, mHash, location)
            }
        }

    fun insertDatabase(
        resourceId: String,
        downloadUri: String,
        downloadId: Long,
        hash: String? = null,
        location: String? = null
    ) {
        FileEntity(downloadmanager_id = downloadId, hash = hash, resourceId = resourceId).run {
            fileDao.insert(this)
        }
    }

    private fun internalDeleteFile(file: File) {
        if (!file.exists())
            return
        if (file.isDirectory) {
            var childrenFile = file.listFiles()
            childrenFile?.forEach {
                if (it.isDirectory) {
                    internalDeleteFile(it)
                }
                it.delete()
            }
        }
        file.delete()
    }

    fun deleteFile(locationUri: String) {
        var bundles =
            rootDirectory?.let {
                arrayOf(File(it.path,locationUri))
        }
        bundles?.filter { it.exists() }?.forEach{
            internalDeleteFile(it)
        }

        var files =
            arrayOf(File(directory.path, locationUri))
        files.filter {
            it?.exists()?:false
        }?.forEach {
            internalDeleteFile(it)
        }

    }

    private fun insertDownloadManager(
        downloadUri: String,
        hash: String? = null,
        location: String? = null
    ): Long {
        var request = DownloadManager.Request(downloadUri.toUri())
        var fileName = downloadUri.toUri().lastPathSegment

        var finalDirectory =
            if (!TextUtils.isEmpty(location)) File(directory, location) else File(directory,fileName)

        var locationFile = if(finalDirectory.isDirectory)File(finalDirectory, fileName)else finalDirectory

        if (locationFile.exists())
            locationFile.delete()
        if(locationFile.isDirectory){
            Log.i(TAG,"file is directory")
            if(!locationFile.exists())
                locationFile.mkdir()
        }else{
            Log.i(TAG,"file is not directory")
            if(!locationFile.parentFile.exists())
                locationFile.mkdir()
        }

        if (!TextUtils.isEmpty(hash)) {
            request.setDescription(hash)
        }
        request
            .setDestinationUri(locationFile.toUri())
            .setTitle(fileName?.substring(0, fileName?.indexOf(".")))
            .setAllowedNetworkTypes(DownloadManager.Request.NETWORK_WIFI)
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE)
        return downloadManager.enqueue(request)
    }
}

data class DataFile(
    var resourceId: String,
    var file: File? = null,
    var statusCode: Int = 0,
    var reason: String? = null,
    var total:Long = 0L,
    var current:Long = 0L
)