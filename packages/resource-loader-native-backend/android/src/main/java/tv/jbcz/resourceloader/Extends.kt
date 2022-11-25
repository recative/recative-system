package tv.jbcz.resourceloader

import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import android.os.Environment
import android.util.Log
import androidx.core.net.toFile
import androidx.core.net.toUri
import fi.iki.elonen.NanoHTTPD
import tv.jbcz.resourceloader.database.FileInfoDao
import java.io.File
import java.io.FileInputStream
import java.io.InputStream

abstract class HttpServer(context: Context) {
    abstract fun start()
    abstract fun stop()
    abstract fun isRunning(): Boolean
}

class SimpleHttpWebServer : HttpServer {
    private lateinit var httpd: WebServer

    constructor(context: Context, port: Int = 10800) : super(context) {
        var folder = File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "external")
        httpd = WebServer(folder, port, context)
    }

    override fun start() {
        if (!httpd.wasStarted())
            httpd.start(5000)
    }

    override fun stop() {
        if (httpd.isAlive)
            httpd.stop()
    }

    override fun isRunning(): Boolean = httpd.isAlive
}

class FileDownloadResponse(var file: File, inputStream: InputStream) :
    NanoHTTPD.Response(Status.OK, "application/octet-stream", inputStream, file.length()) {
}

class WebServer(var rootFolder: File, port: Int, private val context: Context) : NanoHTTPD(port) {
    val helper: GeneralQueryHelper by lazy {
        GeneralQueryHelper(context)
    }

    companion object {
        @JvmStatic
        val TAG = "${WebServer::class.java.simpleName}__tag"
    }

    override fun serve(session: IHTTPSession?) = session?.let { it ->
        var startTime = System.currentTimeMillis()
        var method = it.method
        var uri = it.uri.toUri()
        Log.i(TAG, "uri:$uri , method:$method")
        it.headers?.forEach { entry -> Log.i(TAG, "header:${entry.key} value:${entry.value}") }
        when (method) {
            Method.GET -> {
                var file =fetchFile(uri)
                file?.takeIf { it.exists() }?.let {
                    try {
                        Log.i("ResouceLoaderManager","exists")
                        var inputStream = FileInputStream(file)
                        FileDownloadResponse(it, inputStream)
                    } catch (e: Exception) {
                        newFixedLengthResponse(
                            Response.Status.EXPECTATION_FAILED,
                            "text",
                            e.localizedMessage
                        )
                    }
                } ?: newFixedLengthResponse(
                    Response.Status.NOT_FOUND,
                    "text",
                    "File is not exists"
                )
            }
            Method.HEAD ->{
                var file =fetchFile(uri)
                file?.takeIf { it.exists() }?.let {
                    try {
                        newFixedLengthResponse("success").apply {
                            addHeader("Content-Length","${it.length()}")
                        }
                    } catch (e: Exception) {
                        newFixedLengthResponse(
                            Response.Status.EXPECTATION_FAILED,
                            "text",
                            e.localizedMessage
                        )
                    }
                } ?: newFixedLengthResponse(
                    Response.Status.NOT_FOUND,
                    "text",
                    "File is not exists"
                )
            }
            else -> super.serve(session)
        }.apply {
            Log.i(TAG, "cost:${System.currentTimeMillis() - startTime} ms")
            addHeader("Access-Control-Allow-Origin", "*")
            setChunkedTransfer(true)
        }
    }
    private fun fetchFile(uri:Uri):File? = if (uri.pathSegments.size == 1) getResourceFile(uri) else getBundleFile(uri)
    private fun getResourceFile(uri: Uri): File? = uri.lastPathSegment?.let {
        Log.i("ResouceLoaderManager","$it")
        helper.queryLocationByResourceId(it)?.toUri()?.toFile()
    } ?: null

    private fun getBundleFile(uri: Uri): File? {
        Log.i("$TAG", "run on here:${uri}")
        var rootFolder =
            File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "bundles")
        return File(rootFolder, uri.encodedPath)
    }
}

class GeneralQueryHelper(var context: Context) {
    val queryDao: FileInfoDao by lazy { FileInfoDao(context) }
    fun queryFileEntityById(id: String) = queryDao.queryByResourceId(id)?.last()

    fun queryLocationByResourceId(id: String) = queryFileEntityById(id)?.let { fileEntity ->
        DownloadManager.Query().apply { setFilterById(fileEntity.downloadmanager_id) }
            ?.let { query ->
                var downloadManager =
                    context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                downloadManager.query(query)
                    ?.takeIf { it.moveToNext() }
                    ?.takeIf { it.getInt(it.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS)) == DownloadManager.STATUS_SUCCESSFUL }
                    ?.let { it.getString(it.getColumnIndex(DownloadManager.COLUMN_LOCAL_URI)) }
            }
    }
}
