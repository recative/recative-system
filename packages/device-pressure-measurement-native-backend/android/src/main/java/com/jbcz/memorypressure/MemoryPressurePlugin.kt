package com.jbcz.memorypressure

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.util.Log

import com.getcapacitor.*
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "MemoryPressure")
class MemoryPressurePlugin : Plugin() {
    private val implementation = MemoryPressure()
    private val broadcastReceiver = object: BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (hasListeners("lowMemoryWarning")) {
                notifyListeners("lowMemoryWarning",parseJSObject())
            }
        }
    }
    @PluginMethod
    fun memoryInfo(call: PluginCall){
        parseJSObject()?.run{
            call.resolve(this)
        }?:kotlin.run {
            call.reject("unknown error")
        }
    }

    private fun parseJSObject() = implementation.memoryInfo(context)?.let{
        JSObject().apply {
            put("platform", "Android")
            put("available", it.first)
            put("total", it.second)
            put("usage", it.second - it.first)
        }
    }
    override fun load() {
        super.load()
        context.registerReceiver(broadcastReceiver, IntentFilter("action_low_memory"))
    }

    override fun handleOnDestroy() {
        super.handleOnDestroy()
        context.unregisterReceiver(broadcastReceiver)
    }
}