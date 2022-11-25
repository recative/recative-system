package com.jbcz.videorenderer

import android.content.Context
import android.system.Os.remove
import com.arthenica.ffmpegkit.FFmpegSession
import com.getcapacitor.PluginCall
import java.util.*
import java.util.concurrent.LinkedBlockingQueue
import kotlin.collections.HashMap

class TaskModelMap(val context: Context) {
    private val queue: Queue<String> by lazy {
        LinkedBlockingQueue()
    }
    private val mapIdTaskModel: MutableMap<String, TaskModel> by lazy {
        HashMap()
    }
    private val mapIdFFSession: MutableMap<String, FFmpegSession> by lazy {
        HashMap()
    }
    private val mapIdCAPPlugin: MutableMap<String, PluginCall> by lazy {
        HashMap()
    }
    private val mapIdTask:MutableMap<String,FFmpegTask> by lazy{
        HashMap()
    }
    fun poll():TaskModel?= queue?.firstOrNull { mapIdTaskModel.containsKey(it) }
            ?.let { mapIdTaskModel[it] }
    fun put(model: TaskModel) {
        val id = model.renderTask.renderTaskId
        if (mapIdTaskModel.containsKey(id)) {
            return
        }
        queue.add(model.renderTask.renderTaskId)
    }

    fun putCallback(model: TaskModel, call: PluginCall) {
        val id = model.renderTask.renderTaskId
        mapIdCAPPlugin[id] = call
    }
    fun putTask(model:TaskModel,task:FFmpegTask){
        val id = model.renderTask.renderTaskId
        mapIdTask[id] = task
    }
    fun putSession(model: TaskModel, session: FFmpegSession, forceCancel: Boolean = false) {
        val id = model.renderTask.renderTaskId
        if (forceCancel && mapIdFFSession.containsKey(id)) {
            var ss = mapIdFFSession[id]
            if (ss != null && ss.sessionId != session.sessionId) {
                ss.cancel()
            }
        }
        mapIdFFSession[id] = session
    }
    fun removeTask(model:TaskModel){
        val id = model.renderTask.renderTaskId
        mapIdTask
            ?.takeIf { it.containsKey(id) }
            ?.run { remove(id) }
    }
    fun removeModel(model:TaskModel){
        val id = model.renderTask.renderTaskId
        mapIdTaskModel
            ?.takeIf { it.containsKey(id) }
            ?.run { remove(id) }
    }
    fun removeSession(model:TaskModel){
        val id = model.renderTask.renderTaskId
        mapIdFFSession
            ?.takeIf { it.containsKey(id) }
            ?.run { remove(id) }
    }
    fun removeCallback(model: TaskModel) {
        val id = model.renderTask.renderTaskId
        mapIdCAPPlugin
            ?.takeIf { it.containsKey(id) }
            ?.run { remove(id) }
    }

    fun clearAll() {
        mapIdFFSession?.forEach {
            it.value.cancel()
        }
        mapIdCAPPlugin?.forEach {
            it.value.resolve()
        }
        mapIdFFSession?.clear()
        mapIdCAPPlugin?.clear()
        mapIdTaskModel?.clear()
        queue.clear()
    }
}