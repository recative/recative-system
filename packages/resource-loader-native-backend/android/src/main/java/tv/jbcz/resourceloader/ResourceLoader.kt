package tv.jbcz.resourceloader

import android.content.Context
import android.os.Environment
import android.text.TextUtils
import android.util.Log
import androidx.core.net.toUri
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import java.io.*
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream


class ResourceLoader(val context: Context) {
    val repository: FileDownloadRepository by lazy {
        FileDownloadRepository(context)
    }
    val generLocalHost = "http://localhost:34652"

    /**
     * return:uri Nullable
     */
    fun queryByDownloadId(id: Long): Pair<String, String>? {
        var pair = repository.queryFromDownloadManager(id)
        var replace = repository.directory.toUri().encodedPath
        var path = pair?.second?.toUri()?.encodedPath
        return "${pair?.first}" to "$generLocalHost${path?.replace(replace!!, "")}"
    }

    fun deleteFile(locationUri: String) {
        repository.deleteFile(locationUri)
    }

    fun queryFile(
        resourceId: String,
        downloadUri: String,
        md5Hash: String? = null,
        location: String? = null
    ) =
        parseJSObject(repository.queryFileState(resourceId, downloadUri, md5Hash, location))

    fun fetchFileById(
        resourceId: String,
        downloadUri: String,
        md5Hash: String? = null,
        location: String? = null
    ): JSObject? {
        var dataFile = repository.fetchFileById(resourceId, downloadUri, md5Hash, location)
        return parseJSObject(dataFile)
    }

    fun deleteFileById(resourceId: String) {
        repository.deleteFileById(resourceId)
    }

    @Throws(Exception::class)
    fun unzip(path: String, destine: String?): JSObject? {
        var localPath = path.toUri().encodedPath
        var file = File(
            File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "external"),
            localPath
        )
        var bundleFolder =
            File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "bundles")
        var destineFolder =
            if (!TextUtils.isEmpty(destine)) File(bundleFolder, destine) else bundleFolder
        if (!destineFolder.exists())
            destineFolder.mkdirs()
        var location = internalUnzip(destineFolder, file)
        var localm = if (destine?.startsWith("/") == true) destine else "/$destine"
        var result = JSObject().apply {
            put("result", "$generLocalHost$localm")
        }
        return result
    }

    fun lsList(path: String): JSObject? {
        var rootFolder =
            File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "bundles")
        var destineFolder = if (path == "/") rootFolder else File(
            rootFolder,
            if (path.startsWith("/")) path.removeRange(0, 1) else path
        )
        var result = JSObject()
        if (!destineFolder.exists() || !destineFolder.isDirectory) {
            result.put("files", null)
        } else {
            ls(destineFolder)?.map {
                JSObject().apply {
                    put("fileName", it.first)
                    put("isDirectory", it.second)
                }
            }?.let {
                JSArray().apply {
                    it.forEach { jsObject ->
                        put(jsObject)
                    }
                }
            }.run {
                result.put("files", this)
            }
        }
        return result
    }

    private fun parseJSObject(obj: DataFile) = obj.let {
        var fm = repository.directory.toUri().encodedPath

        var result = JSObject()
        var file = it?.let { datafile ->
            JSObject().apply {
                put("id", it.resourceId)
                datafile.file?.let {
                    var sl = it.toUri().encodedPath
                    var m = sl!!.replace(fm!!, "")
                    put("location_uri", "$generLocalHost$m")
                    Log.i("ResouceLoaderManager", "locationUri:$generLocalHost$m")
                }
            }
        }
        var status = it?.let {
            JSObject().apply {
                put("code", it.statusCode)
                put("message", it.reason)
                put("total", it.total)
                put("current", it.current)
            }
        }
        result.put("file", file)
        result.put("status", status)
        result
    }

    @Throws(Exception::class)
    private fun internalUnzip(destine: File, filePath: File): String {
        var localDestine = destine
        var inputStream: InputStream?
        inputStream = FileInputStream(filePath)
        var zipInputStream = ZipInputStream(BufferedInputStream(inputStream))
        var zipEntry: ZipEntry? = null
        var buffer = ByteArray(1024)
        var count = -1
        zipEntry = zipInputStream.nextEntry
        while (zipEntry != null) {
            var fileName = zipEntry.name
            var file = File(localDestine, fileName)
            var desName = "${localDestine}/$fileName"
            if (zipEntry.isDirectory) {
                Log.i("ResouceLoaderManager", "zipName 1:${desName}")
                File(desName).mkdirs()
            } else {
                //extract zip
                Log.i("ResouceLoaderManager", "zipName 2:${file.toUri()}")
                if (!file.exists())
                    file.createNewFile()
                Log.i("ResouceLoaderManager", "zipName 3:${file.toUri()}")
                var fileOutputStream = FileOutputStream(file)
                count = zipInputStream.read(buffer)
                while (count > -1) {
                    fileOutputStream.write(buffer, 0, count)
                    count = zipInputStream.read(buffer)
                }
                fileOutputStream.close()
            }
            zipInputStream.closeEntry()
            zipEntry = zipInputStream.nextEntry
        }
        zipInputStream.close()
        inputStream.close()
        return destine.toUri()?.encodedPath ?: ""
    }

    private fun ls(rootFolder: File): ArrayList<Pair<String, Boolean>>? {
        var des = ArrayList<Pair<String, Boolean>>()
        rootFolder.listFiles().map {
            it.name to it.isDirectory
        }.toCollection(des)
        return des
    }
}