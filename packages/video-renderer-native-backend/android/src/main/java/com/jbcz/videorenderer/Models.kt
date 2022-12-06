package com.jbcz.videorenderer

import android.os.Parcelable
import com.getcapacitor.PluginCall
import kotlinx.android.parcel.Parcelize

@Parcelize
data class RenderTaskModel(
    var renderTaskId: String,
    var resolutaion: Array<Int>,
    var audioFileName: String? = null,
    var outputFileName: String,
    var fps: Int
) : Parcelable

@Parcelize
data class TaskModel(
    var renderTask: RenderTaskModel,
    var status: Int = 0,
    var message: String? = null,
    var startTime: Long = System.currentTimeMillis(),
    var index: Int = 0
) : Parcelable