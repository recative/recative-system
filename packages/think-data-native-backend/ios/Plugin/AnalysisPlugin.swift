import Foundation
import Capacitor

/**
 * Please read the Capacitor iOS Plugin Development Guide
 * here: https://capacitorjs.com/docs/plugins/ios
 */
@objc(AnalysisPlugin)
public class AnalysisPlugin: CAPPlugin {
    private let implementation = Analysis()
    
    private let ARGUMENT_TYPE_ERROR = "type error"
    @objc func initSdk(_ call: CAPPluginCall){
        let appId = call.getString("appId")
        let serverUrl = call.getString("serverUrl")
        
        guard let appId = appId else {
            call.reject(ARGUMENT_TYPE_ERROR)
            return
        }
        guard let serverUrl = serverUrl else {
            call.reject(ARGUMENT_TYPE_ERROR)
            return
        }
        
        do{
            try implementation.initSdk(appId, serverUrl)
            call.resolve()
        } catch {
            call.reject(error.localizedDescription)
        }
       
    }
    @objc func getDistinctId(_ call: CAPPluginCall){
            var result = [String:Any]()
            let id = implementation.getDistinctId()
            result["result"] = id
            call.resolve(result)
    }
    @objc func setDistinctId(_ call: CAPPluginCall){
        let id = call.getString("id")
        guard let id = id else {
            call.reject(ARGUMENT_TYPE_ERROR)
            return
        }
        do{
            try implementation.setDistinctId(id)
            call.resolve()
        } catch {
            call.reject(error.localizedDescription)
        }
    }
    @objc func signIn(_ call: CAPPluginCall){
        let id = call.getString("id")
        guard let id = id else {
            call.reject(ARGUMENT_TYPE_ERROR)
            return
        }
        do{
            try implementation.signIn(id)
            call.resolve()
        } catch {
            call.reject(error.localizedDescription)
        }
    }
    @objc func signOut(_ call: CAPPluginCall){
            implementation.signOut()
            call.resolve()
    }
    @objc func track(_ call: CAPPluginCall){
        print("aabb helloworld")
        let eventName = call.getString("eventName")
        guard let eventName = eventName else {
            call.reject(ARGUMENT_TYPE_ERROR)
            return
        }
        do{
            let m = call.options.filter {  vk in
                vk.key.hashValue != "eventName".hashValue
            }
            try implementation.track(eventName, m)
            call.resolve()
        } catch {
            call.reject(error.localizedDescription)
        }
    }
    @objc func setPublicProperties(_ call: CAPPluginCall){
        do{
            try implementation.setPublicProperties(call.options!)
            call.resolve()
        } catch {
            call.reject(error.localizedDescription)
        }
    }
    @objc func unsetPublicProperties(_ call: CAPPluginCall){
        do{
            if let key = call.getString("key") {
                try implementation.unsetPublicProperties(key)
                call.resolve()
            }
        } catch {
            call.reject(error.localizedDescription)
        }
    }
    @objc func clearPublicProperties(_ call: CAPPluginCall){
        do{
            try implementation.clearPublicProperties()
            call.resolve()
        } catch {
            call.reject(error.localizedDescription)
        }
    }
    @objc func getPublicProperties(_ call:CAPPluginCall){
        do{
            let vb = try implementation.getPublicProperties()
            var vmb = [String:Any]()
            vb?.forEach({ (key: AnyHashable, value: Any) in
                vmb[key as! String] = value
            })
            call.resolve(vmb)
        } catch {
            call.reject(error.localizedDescription)
        }
    }
    
    @objc func eventStart(_ call:CAPPluginCall){
        let eventName = call.getString("eventName")
        do{
            guard let eventName = eventName else {
                call.reject(ARGUMENT_TYPE_ERROR)
                return
            }
            try implementation.eventStart(eventName)
            call.resolve()
        } catch {
            call.reject(error.localizedDescription)
        }
    }
    
    @objc func eventEnd(_ call:CAPPluginCall){
        let eventName = call.getString("eventName")
        guard let eventName = eventName else{
            call.reject(ARGUMENT_TYPE_ERROR)
            return
        }
        let properties = call.options.filter{ key in
            "eventName".hashValue != key.key.hashValue
        }
        do{
            try implementation.eventEnd(eventName, properties)
            call.resolve()
        } catch {
            call.reject(error.localizedDescription)
        }
    }
    @objc func userSet(_ call:CAPPluginCall){
        do{
            try implementation.userSet(call.options)
            call.resolve()
        } catch {
            call.reject(error.localizedDescription)
        }
    }
    @objc func userSetOnce(_ call:CAPPluginCall){
        do{
            try implementation.userSet(call.options)
            call.resolve()
        } catch {
            call.reject(error.localizedDescription)
        }
    }
    @objc func userAdd(_ call:CAPPluginCall){
        do{
            try implementation.userAdd(call.options)
            call.resolve()
        } catch {
            call.reject(error.localizedDescription)
        }
    }
    @objc func userUnSet(_ call:CAPPluginCall){
        let keys = call.getArray("keys", String.self)
        guard let keys = keys else {
            call.reject(ARGUMENT_TYPE_ERROR)
            return
        }
        do{
            try implementation.userUnSet(keys)
            call.resolve()
        } catch {
            call.reject(error.localizedDescription)
        }
    }
    @objc func userDelete(_ call:CAPPluginCall){
        do{
            try implementation.userDelete()
            call.resolve()
        } catch {
            call.reject(error.localizedDescription)
        }
    }
    @objc func userAppend(_ call:CAPPluginCall){
        do{
            var m = call.options as NSDictionary as![String:[Any]]
            try m.forEach { (key: String, value: [Any]) in
                try implementation.userAppend([key:value])
            }
            call.resolve()
        } catch {
            call.reject(error.localizedDescription)
        }
    }
    @objc func userUniqAppend(_ call:CAPPluginCall){
        do{
            var m = call.options as NSDictionary as![String:[Any]]
            try m.forEach { (key: String, value: [Any]) in
                try implementation.userAppend([key:value])
            }
            call.resolve()
        } catch {
            call.reject(error.localizedDescription)
        }
    }
    @objc func getDeviceId(_ call:CAPPluginCall){
        do{
            let deviceId = try implementation.getDeviceId()
            call.resolve(["result":implementation.getDeviceId()])
        } catch {
            call.reject(error.localizedDescription)
        }
    }
}
