import Foundation
import Capacitor
import GCDWebServer
/**
 * Please read the Capacitor iOS Plugin Development Guide
 * here: https://capacitorjs.com/docs/plugins/ios
 */
@objc(ResourceLoaderPlugin)
public class ResourceLoaderPlugin: CAPPlugin {
    private let implementation = ResourceLoader()
    private var httpServer:GCDWebDAVServer? = nil
    
    @objc func echo(_ call: CAPPluginCall) {
        let value = call.getString("value") ?? ""
        call.resolve([
            "value": implementation.echo(value)
        ])
    }
    
    @objc public func test(_ call:CAPPluginCall) {
        
    }
    @objc public func testError(_ call:CAPPluginCall) {
        
    }
    @objc public func queryFile(_ call:CAPPluginCall) {
        var params = call.getArray("files",JSObject.self)
        var result = params?.filter({(it:[String:Any]) -> Bool in
                    it["id"] != nil && it["uri"] != nil
                }).map{ (it)->[String:Any] in
                    let resourceId = it["id"] as? String ?? ""
                    let uri = it["uri"] as? String ?? ""
                    let md5 = it["md5"] as? String ?? nil
                    let location = it["location"] as? String ?? nil
                    return implementation.queryFile(resourceId as! String,downloadUri:uri as! String,hash:md5)
                }
        var skip = params?.filter({(it:[String:Any]) -> Bool in
            it["id"] == nil || it["uri"] == nil
        })
        call.resolve(["data":result,"skip":skip])
    }
    @objc public func fetchFile(_ call:CAPPluginCall) {
        var params = call.getArray("files",JSObject.self)
        var result = params?.filter({(it:[String:Any]) -> Bool in
                    it["id"] != nil && it["uri"] != nil
                }).map{ (it)->[String:Any] in
                    let resourceId = it["id"] as? String ?? ""
                    let uri = it["uri"] as? String ?? ""
                    let md5 = it["md5"] as? String ?? nil
                    let location = it["location"] as? String ?? nil
                    return implementation.fetchFile(resourceId as! String,downloadUri:uri as! String,hash:md5,location:location)
                }
        var skip = params?.filter({(it:[String:Any]) -> Bool in
            it["id"] == nil || it["uri"] == nil
        })
        call.resolve(["data":result,"skip":skip])
    }
    @objc public func deleteFile(_ call:CAPPluginCall) {
        var files = call.getArray("files",String.self)
        do {
            try files!.forEach{ item in
                implementation.deleteFile(item)
                }
        }catch {
            print("deleteFile:\(error)")
        }
        call.resolve()
    }
    @objc public func deleteFileByIds(_ call:CAPPluginCall) {
        var ids = call.getArray("ids", String.self) ?? [String]()
        var copyList = [String:Bool]()
        for item in ids{
            copyList[item] = true
        }
        for item in ids{
            do {
                try implementation.deleteFileByIds(item)
                copyList[item]=false
            }
            catch {
                print(error)
            }
        }
        var result = copyList.filter { entry in
            entry.value
        }.map { (key: String, value: Bool) in
            key
        }
        call.resolve(["skip":result])
    }
    public override func load() {
        httpServer = GCDWebDAVServer(uploadDirectory:NSHomeDirectory().appending("/Library/Caches/"))
        let proxy = CorsProxy(webserver:httpServer!,urlPrefix:"")
        httpServer?.start(withPort: 34652,bonjourName: "")
        }
    @objc public func ls(_ call:CAPPluginCall){
        var path = call.getString("path")
        var result = implementation.ls(path: path!)
        call.resolve(["files":result])
    }
    @objc public func unZip(_ call:CAPPluginCall){
        var path = call.getString("path")
        var location = call.getString("location")
        if location == nil || location == "" {
            call.reject("location is null")
            return
        }
        do {
            try call.resolve(implementation.unzip(location!, path!))
        } catch {
            call.reject(error.localizedDescription)
        }
    }
}

