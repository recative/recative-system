package com.jbcz.videorenderer

import android.os.*
import android.util.Log
import androidx.core.net.toUri
import com.arthenica.ffmpegkit.FFmpegKit
import com.arthenica.ffmpegkit.FFmpegSession
import com.arthenica.ffmpegkit.ReturnCode
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.PluginMethod
import com.getcapacitor.PluginCall
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import okio.*
import java.io.BufferedOutputStream
import java.io.File
import java.io.FileOutputStream
import java.util.*
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.collections.HashMap
import kotlin.collections.HashSet

@CapacitorPlugin(name = "videoRenderer")
class VideoRendererPlugin : Plugin() {
    val TAG = "${VideoRendererPlugin::class.simpleName}"
    val KEY_STR = "${VideoRendererPlugin::class.simpleName}_extras"
    val cacheDir: File by lazy { File(context.cacheDir, "videoRenderer") }

    val outputDir : File? by lazy{ context.getExternalFilesDir("share") }

    var countDownTimer: CountDownTimer? = null
    var currentTaskModel: TaskModel? = null

    val clearTaskSet: MutableSet<String> by lazy {
        HashSet()
    }

    val taskStack: Stack<TaskModel> by lazy {
        Stack()
    }
    val mapIdCallback: MutableMap<String, PluginCall?> by lazy {
        HashMap()
    }

    val mapIdTransportFinished: MutableMap<String, Boolean?> by lazy {
        HashMap()
    }

    val lock: AtomicBoolean by lazy { AtomicBoolean(false) }

    val handler: Handler by lazy {
        Handler(Looper.myLooper()!!) {
            var task = it.data.getParcelable<TaskModel>(KEY_STR)
            task?.renderTask?.renderTaskId?.takeIf { id -> checkInClearTask(id) }?.run {
                task.status = -1
            }
            var result = when (it.what) {
                0 -> {
                    task?.status = 1
                    true
                }
                -1, 5 -> {
//                    remove() failed() clear()
                    task?.run {
                        notifyOrCall(this)
                        clearTaskById(renderTask.renderTaskId)
                    }
                    taskStack.pop()
                    true
                }
                1 -> {
                    task?.run {
                        renderTask(this)
                    }
                    true
                }
                2 -> {
                    task?.run {
                        if (mapIdTransportFinished[renderTask.renderTaskId] == true && status == 2) {
                            concat(this)
                        }
                    }
                    true
                }
                else -> {
                    false
                }
            }
            lock.set(false)
            result
        }
    }

    private fun clearTaskById(renderTaskId: String) {
        mapIdTransportFinished[renderTaskId] = false
    }

    private fun clearAll() {
        mapIdTransportFinished.forEach { mapIdTransportFinished[it.key] = false }
        mapIdCallback.forEach { it.value?.reject("${it.key} is canceled !") }
    }

    private fun checkInClearTask(renderTaskId: String) = clearTaskSet.contains(renderTaskId)
    var delayCount = 0
    private fun dispatchTask() {
        Log.i(TAG, "videoRenderer:dispatchTask::entry")
        if (delayCount++ < 5) {
            return
        }
        if (lock.get()) {
            Log.i(TAG, "videoRenderer:dispatchTask::return")
            return
        }
        var task = try {
            taskStack.peek()
        } catch (e: Exception) {
            null
        }
        Log.i(TAG, "videoRenderer:dispatchTask::fetchTask")
        task?.run {
            fetchTask(this)
        }
    }

    private fun fetchTask(taskModel: TaskModel) {
        taskModel.let {
            Bundle().apply {
                putParcelable(KEY_STR, it)
            }
        }?.let {
            var doWhat = taskModel.status
            Log.i(TAG, "videoRenderer:fetchTask::dowhat $doWhat")
//            var doWhat = when (taskModel.status) {
//                0 -> 1
//                1,2,3 -> 1
//                else -> -1
//            }
            handler.obtainMessage(doWhat).apply {
                data = it
            }
        }?.run {
            handler.sendMessage(this)
        }
    }

    private fun renderTask(task: TaskModel) {
        Log.i(TAG, "videoRenderer:renderTask::")
        var index = task.index
        var renderTask = task.renderTask
        var file = createRootFolderIfNotExists(renderTask.renderTaskId)
        var buffer = scanChildFiles(file) ?: null
        var count = buffer?.count() ?: 0
        if (count > 0) {
            var session = doImage2View(
                renderTask.resolutaion[0],
                renderTask.resolutaion[1],
                renderTask.fps,
                index,
                count,
                file
            )
            task.status = 1
            var intermidalFile = File(file, "intermidal.txt")
            try {
                record(intermidalFile, "file '$index.mp4' \r\n")
                when (session!!.returnCode.value) {
                    ReturnCode.SUCCESS -> {
                        task.index += count
                    }
                    ReturnCode.CANCEL -> {
                        task.status = -1
                        task.message = "render cancel"
                    }
                    else -> {
                        task.status = -1
                        task.message = "render error"
                    }
                }
                buffer?.filter { it.exists() }?.forEach {
                    it.delete()
                }
            } catch (e: Exception) {
                Log.e(TAG, e.localizedMessage)
            }
            lock.set(false)
        } else {
            if (mapIdTransportFinished[renderTask.renderTaskId] == true)
                task.status = 2
            lock.set(false)
        }
    }

    private fun scanChildFiles(rootDir: File): List<File>? {
        Log.i(TAG, "videoRenderer:scanChildFiles::${rootDir?.toUri()}")
        return rootDir?.listFiles { dir, name ->
            Log.i(TAG, "videoRenderer:scanChildFiles::${dir?.toUri()} name:$name")
            File(dir, name).exists() && File(dir, name).extension == "raw"
        }?.toMutableList()?.sortedBy {
            var fileName = it.name.toUri().lastPathSegment!!
            fileName.substring(0, fileName.indexOf(".raw")).toInt()
        }
    }

    @Throws
    private fun record(file: File, content: String) {
        if (!file.exists())
            file.createNewFile()
        Log.i(TAG, "videoRenderer:record::content $content")
        try {

//            BufferedOutputStream(FileOutputStream(file)).write(content.toByteArray(Charsets.UTF_8))
            file.appendingSink().buffer().writeUtf8(content).close()
        } catch (e: Exception) {
            Log.e(TAG, e.localizedMessage)
        }
    }

    private fun concat(task: TaskModel) {
        Log.i(TAG, "videoRenderer:concat::")
        var renderTask = task.renderTask
        var call = mapIdCallback[task.renderTask.renderTaskId]
        var folder = createRootFolderIfNotExists(renderTask.renderTaskId)
        var codeCSession =
            doCodecAudio(
                File(context.cacheDir, renderTask.audioFileName),
                File(folder, "audio.aac")
            )
        if (!codeCSession!!.returnCode.isValueSuccess) {
//            call?.reject("audio convert failed ${codeCSession.logsAsString}")
            task.message = "audio convert failed ${codeCSession.logsAsString}"
            task.status = -1
            return
        }
        var outputFile = File(outputDir, renderTask.outputFileName)
        if(!outputFile.parentFile.exists()) {
            Log.i(TAG,"videoRenderer:concat::create parentFile")
            outputFile.parentFile.mkdirs()
        }
        var session = doConcat(
            File(folder, "intermidal.txt"),
            File(folder, "audio.aac"),
            outputFile
        )
        if (!session!!.returnCode.isValueSuccess) {
//            call?.reject("concat failed ${session.logsAsString}")
            task.message = "concat failed ${session.logsAsString}"
            task.status = -1
            return
        }
        parseResult(task)?.run {
//            call?.resolve(this)
            task.status = 5
        }
    }

    private fun createRootFolderIfNotExists(renderTaskId: String): File {
        var file = File(cacheDir, renderTaskId)
        if (!file.exists()) {
            Log.i(TAG, "videoRenderer:createRootFolderIfNotExists::${file.absolutePath}")
            file.mkdir()
        }
        return file
    }

    @PluginMethod
    fun createTask(call: PluginCall) {
        System.out.println("videoRenderer::createTask::")
        var renderTaskId = call.getString("renderTaskId", "")
        if (renderTaskId?.isEmpty() == true) {
            call.reject("renderTaskId is null")
            return
        }
        var resolutaion = call.getArray("resolution").toList<Int>()
        var audioFileName = call.getString("audioFileName")
        var outputFileName = call.getString("outputFileName")
        var fps = call.getInt("fps", 30)

        var taskModel = createNewRenderTask(
            renderTaskId!!,
            resolutaion[0],
            resolutaion[1],
            outputFileName!!,
            fps!!,
            audioFileName
        )
        taskStack.push(taskModel)
        initOrCreateCountTimer()
        call.resolve()
    }

    @PluginMethod
    fun finalize(call: PluginCall) {
        var renderTaskId = call.getString("renderTaskId")
        renderTaskId?.run {
            mapIdTransportFinished[this] = true
            mapIdCallback[renderTaskId] = call
        }
    }

    @PluginMethod
    fun clearTask(call: PluginCall) {
        var renderTaskId = call.getString("renderTaskId")
        if (renderTaskId?.isNotEmpty() == true && !clearTaskSet.contains(renderTaskId)) clearTaskSet.add(
            renderTaskId
        )
    }

    private fun initOrCreateCountTimer() {
        if (countDownTimer == null) {
            try {
                currentTaskModel = taskStack.peek()
                countDownTimer = object : CountDownTimer(Long.MAX_VALUE, 5000) {
                    override fun onTick(millisUntilFinished: Long) {
                        dispatchTask()
                    }

                    override fun onFinish() {
                        clearAll()
                    }
                }
            } catch (e: Exception) {
                clearAll()
            }
            countDownTimer!!.start()
        }
    }

    private fun createNewRenderTask(
        renderTaskId: String,
        width: Int,
        height: Int,
        outputFileName: String,
        fps: Int,
        audioFileName: String? = null
    ) = RenderTaskModel(
        renderTaskId = renderTaskId,
        resolutaion = arrayOf(width, height),
        outputFileName = outputFileName,
        fps = fps,
        audioFileName = audioFileName
    ).let {
        TaskModel(
            renderTask = it,
            status = 0,
            index = 0
        )
    }

    private fun notifyOrCall(task: TaskModel) {
        var promise = mapIdCallback[task.renderTask.renderTaskId]
        Log.i(TAG, "videoRenderer:notifyOrCall::")
        if (promise == null)
            Log.i(TAG, "videoRenderer:notifyOrCall:: callback is null")
        Log.i(TAG,"videoRenderer:notifyOrCall::status ${task.status}")
        when (task.status) {
            5 -> {
                promise?.resolve(parseResult(task))
            }
            -1 -> {
                promise?.reject("render id:${task.renderTask.renderTaskId} cause:${task.message}")
            }
        }
    }

    private fun parseResult(task: TaskModel) = JSObject().apply {
        put("status",JSObject().apply {
            put("status",if(task.status == 5) 0 else task.status)
            put("message",task.message?:"")
        })
        put("renderTask",JSObject().apply {
            var renderTaskId = task.renderTask.renderTaskId
            var vm = File(outputDir, task.renderTask.outputFileName)
            put("renderTaskId", renderTaskId)
            var m ="file://${vm.absolutePath}"
            Log.i(TAG,"videoRenderer:parseResult::$m")
            put("url", m)
        })
    }


    private fun doImage2View(
        width: Int,
        height: Int,
        fps: Int,
        index: Int,
        count: Int,
        rootDir: File
    ): FFmpegSession? {
        var dir = rootDir.absolutePath
        var endFrames = count
        var executeCmd =
            "-f image2 -video_size ${width}x$height -pixel_format rgba -framerate $fps -start_number $index -i $dir/%d.raw -frames:v $endFrames -c:v h264 -vf \"fps=$fps, format=yuv420p\" $dir/$index.mp4"
        Log.i(TAG, "videoRenderer:doImage2View::execute:$executeCmd")
        return FFmpegKit.execute(executeCmd)
    }

    private fun doCodecAudio(audioFile: File, outputFile: File): FFmpegSession? {
        var executeCmd = "-i ${audioFile.absolutePath} ${outputFile.absolutePath}"
        return FFmpegKit.execute(executeCmd)
    }

    private fun doConcat(intermidalFile: File, audioFile: File, outputFile: File): FFmpegSession? {
        val executeCmd =
            "-f concat -safe 0 -i ${intermidalFile.absolutePath} -i ${audioFile.absolutePath} -c copy '${outputFile.absolutePath}'"
        return FFmpegKit.execute(executeCmd)
    }

}