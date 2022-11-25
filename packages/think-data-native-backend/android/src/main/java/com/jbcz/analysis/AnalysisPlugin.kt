package com.jbcz.analysis

import android.text.TextUtils
import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "Analysis")
class AnalysisPlugin : Plugin() {
    private val implementation: Analysis by lazy {
        Analysis(context)
    }

    @PluginMethod
    fun initSdk(call: PluginCall) {
        var appId = call.getString("appId", "")
        var serverUrl = call.getString("serverUrl", "")
        try {
            implementation.initSdk(appId!!, serverUrl!!)
            call.resolve()
        } catch (e: Exception) {
            call.reject(e.localizedMessage)
        }
    }

    @PluginMethod
    fun getDistinctId(call: PluginCall) {
        var result = JSObject()
        try {
            result.put("result", implementation.getDistinctId())
            call.resolve(result)
        } catch (e: Exception) {
            call.reject(e.localizedMessage)
        }
    }

    @PluginMethod
    fun setDistinctId(call: PluginCall) {
        var id = call.data.getString("id")
        if (TextUtils.isEmpty(id)) {
            call.reject("id is empty")
        } else {
            implementation.setDistinctId(id!!)
            call.resolve()
        }
    }

    @PluginMethod
    fun signIn(call: PluginCall) {
        var id = call.getString("id")
        if (TextUtils.isEmpty(id)) {
            call.reject("id is empty")
        } else {
            implementation.signIn(id!!)
            call.resolve()
        }
    }

    @PluginMethod
    fun signOut(call: PluginCall) {
        try {
            implementation.signOut()
            call.resolve()
        } catch (e: Exception) {
            call.reject(e.localizedMessage)
        }
    }

    @PluginMethod
    fun track(call: PluginCall) {
        var en = call.data.getString("eventName", "")!!
        var m = call.data
        var result = jsonToMap(filterKeys = arrayOf("eventName"), jsonBody = m)
        Log.i("args", "data:${call.data},$en")
        implementation.track(eventName = en, map = result)
        call.resolve()
    }

    @PluginMethod
    fun setPublicProperties(call: PluginCall) {
        var requests = call.data
        var result = jsonToMap(jsonBody = requests)
        implementation.setPublicProperties(result)
        call.resolve()
    }
    @PluginMethod
    fun unsetPublicProperties(call:PluginCall){
        try {
            var key = call.getString("key","")
            implementation.unsetPublicProperties(key!!)
        } catch (e: Exception) {
            call.reject(e.localizedMessage)
        }
    }
    @PluginMethod
    fun clearPublicProperties(call:PluginCall){
        try {
            implementation.clearPublicProperties()
            call.resolve()
        } catch (e: Exception) {
            call.reject(e.localizedMessage)
        }
    }
    @PluginMethod
    fun getPublicProperties(call:PluginCall){
        try {
            var result =JSObject()
            var map = implementation.getPublicProperties()
            map.forEach {
                result.put(it.key,it.value)
            }
            call.resolve(result)
        } catch (e: Exception) {
            call.reject(e.localizedMessage)
        }

    }

    @PluginMethod
    fun eventStart(call: PluginCall) {
        var eventName = call.getString("eventName", "")!!
        implementation.eventStart(eventName)
        call.resolve()
    }

    @PluginMethod
    fun eventEnd(call: PluginCall) {
        var eventName = call.getString("eventName", "")!!
        var result = jsonToMap(filterKeys = arrayOf("eventName"), jsonBody = call.data)
        implementation.eventEnd(eventName, result)
        call.resolve()
    }

    @PluginMethod
    fun userSet(call: PluginCall) {
        implementation.userSet(jsonToMap(jsonBody = call.data))
        call.resolve()
    }

    @PluginMethod
    fun userSetOnce(call: PluginCall) {
        implementation.userSetOnce(jsonToMap(jsonBody = call.data))
        call.resolve()
    }

    @PluginMethod
    fun userAdd(call: PluginCall) {
        implementation.userAdd(jsonToMap(jsonBody = call.data))
        call.resolve()
    }

    @PluginMethod
    fun userUnSet(call: PluginCall) {
        try {
            var m = call.getArray("keys").toList<String>()
            implementation.userUnSet(m.toTypedArray())
            call.resolve()
        } catch (e: Exception) {
            call.reject(e.localizedMessage)
        }
    }

    @PluginMethod
    fun userDelete(call: PluginCall) {
        try {
            implementation.userDelete()
            call.resolve()
        } catch (e: Exception) {
            call.reject(e.localizedMessage)
        }
    }

    @PluginMethod
    fun userAppend(call: PluginCall) {
        try {
            var fmp = jsonToMap(jsonBody = call.data)
            fmp.forEach{
                implementation.userAppend(it.key,it.value)
            }
            call.resolve()
        } catch (e: Exception) {
            call.reject(e.localizedMessage)
        }
    }

    @PluginMethod
    fun userUniqAppend(call: PluginCall) {
        try {
            var fmp = jsonToMap(jsonBody = call.data)
            fmp.forEach{
                implementation.userAppend(it.key,it.value)
            }
            call.resolve()
        } catch (e: Exception) {
            call.reject(e.localizedMessage)
        }
    }

    @PluginMethod
    fun getDeviceId(call: PluginCall) {
        var result = JSObject()
        try {
            var id = implementation.getDeviceId()
            result.put("result", id)
            call.resolve(result)
        } catch (e: Exception) {
            call.reject(e.localizedMessage)
        }
    }

    private fun jsonToMap(filterKeys: Array<String>? = null, jsonBody: JSObject): Map<String, Any> {
        var result = HashMap<String, Any>()
        for (iter in jsonBody.keys()) {
            var isNotNone = filterKeys?.none { it == iter } ?: false
//            Not in put it or continue
            if (!isNotNone) {
                continue
            }
            result[iter] = jsonBody[iter]
        }
        return result
    }
}