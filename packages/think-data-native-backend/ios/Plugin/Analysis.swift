import Foundation
import ThinkingSDK

@objc public class Analysis: NSObject {
    var  instance : ThinkingAnalyticsSDK? = nil
    @objc public func echo(_ value: String) -> String {
        print(value)
        return value
    }
    @objc func initSdk(_ appId: String?,_ url: String?)throws{
        guard let id = appId, id != nil else {
            throw NSError(domain:"appId is nil",code:500)
        }
        guard let serverUrl = url , serverUrl != nil else {
            throw NSError(domain:"serverUrl is nil",code:500)
        }
        let config = TDConfig.init(appId: id, serverUrl: serverUrl)
        instance = ThinkingAnalyticsSDK.start(with:config)
        instance?.enableAutoTrack(ThinkingAnalyticsAutoTrackEventType.eventTypeAll)
    }
    @objc func getDistinctId() -> String?{
        return instance?.getDistinctId()
    }
    @objc func setDistinctId(_ id: String?) throws {
        guard let identify = id , identify != nil else {
            throw NSError(domain:"id is nil",code:500)
        }
        if let sdk = instance {
            sdk.identify("\(identify)")
        }
    }
    @objc func signIn(_ account: String?)throws{
        if let sdk = instance {
            sdk.login("\(account!)")
        }
    }
    @objc func signOut(){
        if let sdk = instance {
            sdk.logout()
        }
    }
    @objc func track(_ eventName:String?,_ properties:[AnyHashable:Any]? = nil)throws{
        guard let event = eventName , eventName != nil else {
            throw NSError(domain:"eventName is nil",code:500)
        }
        if let sdk = instance {
            if  properties != nil && properties?.isEmpty == false {
                sdk.track(event, properties: properties)
            } else {
                sdk.track(event)
            }
        }
    }
    @objc func setPublicProperties(_ properties:[AnyHashable:Any]){
        if let sdk = instance {
            sdk.setSuperProperties(properties)
        }
    }
    @objc func unsetPublicProperties(_ property: String)throws{
        if let sdk = instance {
            sdk.unsetSuperProperty(property)
        }
    }
    @objc func clearPublicProperties()throws{
        if let sdk = instance {
            sdk.clearSuperProperties()
        }
    }
    @objc func getPublicProperties()->[AnyHashable:Any]?{
        if let sdk = instance {
            return sdk.superProperty
        } else{
            return nil
        }
    }
    @objc func eventStart(_ eventName:String?)throws{
        guard let event = eventName , event != nil else {
            throw NSError(domain:"serverUrl is nil",code:500)
        }
        if let sdk = instance {
            sdk.timeEvent(event)
        }
    }
    @objc func eventEnd(_ event:String?,_ properties:[AnyHashable : Any]? = nil)throws{
        if instance != nil {
            do{
            try track(event,properties)
            } catch {
                throw error
            }
        }
    }
    @objc func userSet(_ properties:[AnyHashable:Any]?)throws{
        guard let propertie = properties  , !propertie.isEmpty else {
            throw NSError(domain:"properties is nil",code:500)
        }
        if let sdk = instance {
            sdk.user_set(propertie)
        }
    }
    @objc func userSetOnce(_ properties:[AnyHashable:Any]?)throws{
        guard let propertie = properties , !propertie.isEmpty else {
            throw NSError(domain:"properties is nil",code:500)
        }
        if let sdk = instance {
            sdk.user_setOnce(propertie)
        }
    }
    @objc func userAdd(_ properties:[AnyHashable:Any]?)throws{
        guard let propertie = properties , propertie != nil , !propertie.isEmpty else {
            throw NSError(domain:"properties is nil",code:500)
        }
        if let sdk = instance {
            sdk.user_add(propertie)
        }
    }
    @objc func userUnSet(_ keys:[String]?){
        if let sdk = instance {
            keys?.forEach { item in
                sdk.user_unset(item)
            }
        }
    }
    
    @objc func userDelete(){
        if let sdk = instance {
            sdk.user_delete()
        }
    }
    @objc func userAppend(_ properties:[String:[Any]]?)throws{
        guard let propertie = properties , propertie != nil , !propertie.isEmpty else {
            throw NSError(domain:"properties is nil",code:500)
        }
        if let sdk = instance {
            sdk.user_append(propertie)
        }
    }
    @objc func userUniqAppend(_ properties:[String:[Any]]?)throws{
        guard let propertie = properties , propertie != nil , !propertie.isEmpty else {
            throw NSError(domain:"properties is nil",code:500)
        }
        if let sdk = instance {
            sdk.user_uniqAppend(propertie)
        }
    }
    @objc func getDeviceId() -> String {
        if let sdk = instance {
            return sdk.getDeviceId()
        }else{ return ""}
    }
}
