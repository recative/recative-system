import Foundation
import SSZipArchive
@objc public class ResourceLoader: NSObject {
   lazy var repository:Repository = {
       return Repository()
   }()
    @objc public func echo(_ value: String) -> String {
        print(value)
        return value
    }
    @objc public func test(_ value:String) -> String {
        NSLog("called");
        return ""
    }
    @objc public func testError(_ value:String) -> String {
        return ""
    }
    @objc public func queryFile(_ value:String,downloadUri:String,hash:String? = nil) -> [String:Any] {
        var dataWrapper=repository.queryFileState(resourceId: value, downloadUri: downloadUri,mHash: hash)
        return parseJsonObject(dataWrapper)
    }
    @objc public func fetchFile(_ value:String,downloadUri:String,hash:String? = nil,location:String? = nil)-> [String:Any] {
        let dataWrapper=repository.fetchFileById(resourceId: value, downloadUri: downloadUri,mHash: hash,location: location)
        return parseJsonObject(dataWrapper)
    }
    @objc public func deleteFile(_ value:String) -> Void {
        repository.deleteFile(location: value)
    }
    @objc public func deleteFileByIds(_ value:String) -> Void {
        repository.deleteFileById(resourceId: value)
    }
    
    private func parseJsonObject(_ wrapper:DataFileWrapper) -> [String:Any]{
        var file = [String:Any]()
        file["id"] = wrapper.resourceId
        if wrapper.filePath != nil {file["location_uri"] = "http://localhost:34652/\(wrapper.filePath!)"}
       
        var status = [String:Any]()
        status["code"] = wrapper.statusCode
        status["message"] = wrapper.reason
        status["current"] = wrapper.current
        status["total"] = wrapper.total
        
        return ["file":file,"status":status]

    }
    @objc public func unzip(_ to:String,_ filePath:String) throws -> [String:Any] {
        let localPath = NSSearchPathForDirectoriesInDomains(FileManager.SearchPathDirectory.cachesDirectory, FileManager.SearchPathDomainMask.userDomainMask, true).first!.appending(URL(string:filePath)!.relativePath)
        let rootDirectory = NSSearchPathForDirectoriesInDomains(FileManager.SearchPathDirectory.applicationSupportDirectory, FileManager.SearchPathDomainMask.userDomainMask, true).first?.appending("/bundles")
        let localTo = rootDirectory?.appending(to.starts(with: "/") ? to :"/\(to)")
        var result = [String:Any]()
//        目录不存在则创建
        if !FileManager.default.fileExists(atPath: localTo!) {
            do {
                try FileManager.default.createDirectory(atPath: localTo!, withIntermediateDirectories: true)
            } catch {
                print(error)
            }
        }
        let location = try internalUnzip(localTo!,localPath)
        result["result"] = "http://localhost:34652/\(to)"
        return result
    }
    
    private func internalUnzip(_ to:String,_ filePath:String) throws -> String {
        let localDestine = to
        guard FileManager.default.fileExists(atPath: filePath) else {
            throw NSError(domain:"FileNotFound", code: 404 ,userInfo: ["filePath":filePath , "to":to])
        }
        try? SSZipArchive.unzipFile(atPath: filePath, toDestination: localDestine,overwrite: true, password:nil)
        return "/"+to
    }
    @objc public func ls(path:String) -> [[String:Any]]? {
        var documentsURL = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        documentsURL.appendPathComponent("/bundles")
        documentsURL.appendPathComponent(path)
         do {
            let fileURLs = try FileManager.default.contentsOfDirectory(at: documentsURL, includingPropertiesForKeys: nil)
             return fileURLs.map {  ["fileName" : $0.lastPathComponent,"isDirectory" : $0.isDirectory ]  }
        }catch {
            print(error)
            return nil
        }
    }
}
