package com.jbcz.analysis

import com.getcapacitor.JSObject
import org.json.JSONObject


internal fun Map<String,Any>.toJson():JSONObject{
    var result = JSONObject()
    this.forEach { result.put(it.key,it.value) }
    return result
}
//internal fun JSObject.toMap():Map<String,Any>{
//
//}