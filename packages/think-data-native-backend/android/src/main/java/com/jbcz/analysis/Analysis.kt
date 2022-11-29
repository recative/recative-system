package com.jbcz.analysis

import android.content.Context
import android.util.Log
import cn.thinkingdata.android.BuildConfig
import cn.thinkingdata.android.TDConfig
import cn.thinkingdata.android.ThinkingAnalyticsSDK
import org.json.JSONArray
import org.json.JSONObject

class Analysis(val context: Context) {
    lateinit var sdk: ThinkingAnalyticsSDK
    fun initSdk(key: String, url: String) {

        var config = TDConfig.getInstance(context, key, url)
        ThinkingAnalyticsSDK.enableTrackLog(true)
        sdk = ThinkingAnalyticsSDK.sharedInstance(config)
        ArrayList<ThinkingAnalyticsSDK.AutoTrackEventType>().apply {
            add(ThinkingAnalyticsSDK.AutoTrackEventType.APP_INSTALL)
            add(ThinkingAnalyticsSDK.AutoTrackEventType.APP_START)
            add(ThinkingAnalyticsSDK.AutoTrackEventType.APP_END)
            add(ThinkingAnalyticsSDK.AutoTrackEventType.APP_CRASH)
            add(ThinkingAnalyticsSDK.AutoTrackEventType.APP_VIEW_SCREEN)
        }.run{
            sdk.enableAutoTrack(this)
        }
    }

    fun getDistinctId(): String {
        return sdk.distinctId
    }

    fun setDistinctId(id: String) {
        sdk.identify(id)
    }

    fun signIn(account: String) {
        sdk.login(account)
    }

    fun signOut() {
        sdk.logout()
    }

    fun track(eventName: String, map: Map<String, Any>? = null) {
        if (map == null) {
            sdk.track(eventName)
        } else {
            sdk.track(eventName, map.toJson())
        }
    }

    fun setPublicProperties(map: Map<String, Any>? = null) {
        map?.run {
            sdk.superProperties = map.toJson()
        }
    }

    fun unsetPublicProperties(key: String) {
        sdk.unsetSuperProperty(key)
    }

    fun clearPublicProperties() {
        sdk.clearSuperProperties()
    }

    fun getPublicProperties(): Map<String, Any> = HashMap<String, Any>().apply {
        var pro = sdk.superProperties
        for (iter in pro.keys()) {
            this[iter] = pro[iter]
        }
    }

    fun eventStart(eventName: String) {
        sdk.timeEvent(eventName)
    }

    fun eventEnd(eventName: String, map: Map<String, Any>? = null) {
        track(eventName, map)
    }

    fun userSet(map: Map<String, Any>? = null) {
        map?.run {
            sdk.user_set(toJson())
        }
    }

    fun userSetOnce(map: Map<String, Any>? = null) {
        map?.run {
            sdk.user_setOnce(toJson())
        }
    }

    fun userAdd(map: Map<String, Any>? = null) {
        map?.run {
            sdk.user_add(toJson())
        }
    }

    fun userUnSet(keys: Array<String>) {
        sdk.user_unset(*keys)
    }

    fun userDelete() {
        sdk.user_delete()
    }

    fun userAppend(key:String,value:Any) {
        var b=JSONObject().apply{
            put(key,value)
        }
        sdk.user_append(b)
    }

    fun userUniqAppend(key:String,value:Any) {
        var b=JSONObject().apply{
            put(key,value)
        }
        sdk.user_append(b)
    }

    fun getDeviceId(): String {
        return sdk.deviceId
    }
}