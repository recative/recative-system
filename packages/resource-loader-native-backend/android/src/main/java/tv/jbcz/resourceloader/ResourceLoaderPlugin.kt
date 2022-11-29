package tv.jbcz.resourceloader

import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.text.TextUtils
import android.util.Log
import android.view.TextureView
import androidx.annotation.Keep
import androidx.core.net.toUri
import com.getcapacitor.*
import com.getcapacitor.JSObject.fromJSONObject
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONArray
import org.json.JSONObject
import tv.jbcz.resourceloader.HttpServer
import tv.jbcz.resourceloader.SimpleHttpWebServer
import java.io.File
import java.util.*
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

@CapacitorPlugin(name = "ResourceLoader")
class ResourceLoaderPlugin : Plugin() {

    private val threadPool: ExecutorService by lazy {
        Executors.newSingleThreadExecutor()
    }
    private val implementation: ResourceLoader by lazy {
        ResourceLoader(context)
    }
    private val httpdServer: HttpServer by lazy {
        SimpleHttpWebServer(context,34652)
    }
    val broadcastReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            when (intent?.action) {
                DownloadManager.ACTION_DOWNLOAD_COMPLETE -> {
                    if (hasListeners("onComplete")) {
                        var id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1)
                        var pairs = implementation.queryByDownloadId(id)
                        if (pairs != null) {
                            var result = JSObject()
                            var file = JSObject()
                            file.put("location_uri", pairs.second)
                            file.put("id", pairs.first)
                            var status=JSONObject()
                            status.put("code",0)

                            result.put("file", file)
                            result.put("status",status)
                            notifyListeners("onComplete", result, false)
                        }
                    }
                }
                Intent.ACTION_DEVICE_STORAGE_LOW -> {
                    if (hasListeners("onError")) {
                        var error = JSObject()
//                        var result = JSObject()
                        error.put("code", "-10")
                        error.put("message", "Not enough space")

//                        result.put("error", error)
                        notifyListeners("onError", error, false)
                    }
                }
            }
        }
    }

    override fun load() {
        super.load()
        context.registerReceiver(broadcastReceiver, IntentFilter().apply {
            addAction(DownloadManager.ACTION_DOWNLOAD_COMPLETE)
            addAction(Intent.ACTION_DEVICE_STORAGE_LOW)
        })
        httpdServer.start()
    }

    var registered = AtomicBoolean(false)

    @PluginMethod
    fun testError(call: PluginCall) {
        if (hasListeners("onError")) {
            var error = JSObject()
//                        var result = JSObject()
            error.put("code", "-10")
            error.put("message", "Not enough space")

//                        result.put("error", error)
            notifyListeners("onError", error, false)
        } else {
            call.resolve()
        }
    }

    @PluginMethod
    fun test(call: PluginCall) {
        if (hasListeners("onComplete")) {
            var id = "uid11"
            var locationUri = "/mock/path1/file.txt"
            var result = JSObject()
            var file = JSObject()
            file.put("location_uri", locationUri)
            file.put("id", id)
            var status=JSONObject()
            status.put("code",0)

            result.put("data", file)
            result.put("status",status)
            notifyListeners("onComplete", result, false)
        } else {
            call.resolve()
        }
    }
    @PluginMethod
    fun queryFile(call:PluginCall){
        try {
            var params = call.getArray("files").toList<JSONObject>()
            val resultArray = JSArray()
            var m = System.currentTimeMillis()
            params?.filter { it.has("id") && it.has("uri") }
                ?.map {
                    var resourceId = it.getString("id")
                    var uri = it.getString("uri")
                    var md5 = if (it.has("md5")) it.getString("md5") else null
                    var location = if (it.has("location")) it.getString("location") else null
                   implementation.queryFile(
                        resourceId = resourceId,
                        downloadUri = uri,
                        md5Hash = md5,
                        location = location
                    )
                }?.forEach {
                    resultArray.put(it)
                }
            var duration = System.currentTimeMillis() - m
            if (!activity.isFinishing) {
                val result = JSObject()
                result.put("data", if (resultArray.length() != 0) resultArray else null)
                skip(params)?.run {
                    result.put("skip", this)
                }
                if (duration <= 30000) {
                    call.resolve(result)
                } else {
                    call.reject("timeout", "-1")
                }
            }
        } catch (e: Exception) {
            call.reject(e.localizedMessage, e)
        }
    }
    private fun skip(params:List<JSONObject>?):JSArray?=params?.filter { !(it.has("id") && it.has("uri")) }?.map {
            var res = JSObject()
            if (it.has("id")) {
                res.put("id", it.getString("id"))
            }
            if (it.has("uri")) {
                res.put("uri", it.getString("uri"))
            }
            res
        }?.let {
            JSArray().apply {
                it.forEach {
                    this.put(it)
                }
            }
        }
    @PluginMethod
    fun fetchFile(call: PluginCall) {
        try {
            var params = call.getArray("files").toList<JSONObject>()
            val resultArray = JSArray()
            var m = System.currentTimeMillis()
            params?.filter { it.has("id") && it.has("uri") }
                ?.map {
                    var resourceId = it.getString("id")
                    var uri = it.getString("uri")
                    var md5 = if (it.has("md5")) it.getString("md5") else null
                    var location = if (it.has("location")) it.getString("location") else null
                    implementation.fetchFileById(
                        resourceId = resourceId,
                        downloadUri = uri,
                        md5Hash = md5,
                        location = location
                    )
                }?.forEach {
                    resultArray.put(it)
                }
            var duration = System.currentTimeMillis() - m
            if (!activity.isFinishing) {
                val result = JSObject()
                result.put("data", if (resultArray.length() != 0) resultArray else null)
                skip(params)?.run {
                    result.put("skip", this)
                }
                if (duration <= 30000) {
                    call.resolve(result)
                } else {
                    call.reject("timeout", "-1")
                }
            }
        } catch (e: Exception) {
            call.reject(e.localizedMessage, e)
        }
    }

    @PluginMethod
    fun deleteFileByIds(call: PluginCall) {
        try {
            var ids = call.data.getJSONArray("ids")
            var copyList = ArrayList<String>()
            var mapList = ids.let {
                ArrayList<String>().apply {
                    for (i in 0 until ids.length()) {
                        this.add(it[i].toString())
                        copyList.add(it[i].toString())
                    }
                }
            }
            mapList.forEachIndexed { index, s ->
                implementation.deleteFileById(s)
                copyList.removeAt(index)
            }
            var result = JSObject()
            result.put("skip", copyList)
            call.resolve(result)
        } catch (e: Exception) {
            call.reject(e.localizedMessage)
        }

    }

    @PluginMethod
    fun deleteFile(call: PluginCall) {
        var files = call.data.getJSONArray("files")
        var result = ""
        for (i in 0 until files.length()) {
//            result+=files[i]
            implementation.deleteFile(files[i].toString())
        }
        call.resolve()
    }
    @PluginMethod
    fun unZip(call: PluginCall){
        var path = call.data.getString("path")
        var location = call.data.getString("location","")
        if(TextUtils.isEmpty(location)){
            call.reject("location is null")
            return
        }
        Log.i("${ResourceLoaderPlugin::class.simpleName}","path:$path,location:$location")
        try {
            call.resolve(implementation.unzip(path!!,location))
        } catch (e: Exception) {
            call.reject(e.localizedMessage)
        }
    }
    @PluginMethod
    fun ls(call: PluginCall){
        var path = call.data.getString("path")
        Log.i("${ResourceLoaderPlugin::class.simpleName}","path:$path")
        call.resolve(implementation.lsList(path!!))
    }

    override fun handleOnDestroy() {
        super.handleOnDestroy()
        if (registered.get()) {
            registered.set(false)
            context.unregisterReceiver(broadcastReceiver)
        }
        httpdServer.stop()
    }
}