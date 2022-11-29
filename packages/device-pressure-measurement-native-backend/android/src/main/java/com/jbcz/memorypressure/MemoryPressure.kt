package com.jbcz.memorypressure

import android.app.ActivityManager
import android.content.Context
import android.util.Log
import com.getcapacitor.annotation.CapacitorPlugin
import com.jbcz.memorypressure.MemoryPressure
import com.getcapacitor.PluginMethod
import com.getcapacitor.PluginCall
import com.getcapacitor.JSObject

class MemoryPressure {
    fun memoryInfo(context:Context?) = context?.let {
            context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        }?.let{
        ActivityManager.MemoryInfo().apply {
            it.getMemoryInfo(this)
        }?.let{
            it.availMem to it.totalMem
        }
    }
}