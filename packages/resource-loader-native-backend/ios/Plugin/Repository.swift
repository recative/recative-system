//
//  Repository.swift
//  Plugin
//
//  Created by Sun on 2022/2/24.
//  Copyright © 2022 Max Lynch. All rights reserved.
//

import Foundation
import SQLite
import ActiveSQLite
import GCDWebServer
import CommonCrypto

class DownloadFileModel : ASModel {
    var downloadmanagerId=NSNumber(value:0)
    var fileHash: String = ""
    var resourceId: String = ""
    var retryCount: UInt = 0
}
class DataFileWrapper{
    var resourceId:String = ""
    var statusCode:Int=0
    var reason:String? = nil
    var filePath:String? = nil
    var current :Int64 = 0
    var total :Int64 = Int64.max
}

class Repository{
    lazy var downloadManager=Engine(downloadManagerImpl:JBCZDownloadManagerImpl())
    lazy var queryDao = QueryDao()
    var directory = NSHomeDirectory()
    var rootDirectory = NSSearchPathForDirectoriesInDomains(FileManager.SearchPathDirectory.cachesDirectory, FileManager.SearchPathDomainMask.userDomainMask, true).first!
    init(){
        ASConfigration.logLevel = .debug

        let dbDirectory = NSSearchPathForDirectoriesInDomains(FileManager.SearchPathDirectory.applicationSupportDirectory, FileManager.SearchPathDomainMask.userDomainMask, true).first?.appending("/file")
        let dbFile = dbDirectory?.appending("/sqlite3.db")
        if !FileManager.default.fileExists(atPath: dbDirectory!) {
           do{
            try FileManager.default.createDirectory(atPath:dbDirectory!,withIntermediateDirectories:true)}
           catch {
            print(error)
           }
        }
        if !FileManager.default.fileExists(atPath: dbFile!) {
            FileManager.default.createFile(atPath:dbFile!,contents:nil)
        }
        ASConfigration.setDefaultDB(path:dbFile!, name: "inner_system")
        ASConfigration.setDB(path: dbFile!, name: "inner_system", isAutoCreate: true)
        print("init db")
        do {
        print("create table")
        try! DownloadFileModel.createTable()
        try! DownloadTaskModel.createTable()
        } catch {
            print(error)
        }
        
        do{ try print("db:\(ASConfigration.getDefaultDB())")}
        catch { print(error)}
    }
    
    func queryFileState(resourceId: String,downloadUri: String,mHash: String? = nil) -> DataFileWrapper {
        let result=DataFileWrapper()
        result.resourceId=resourceId
        let taskModel=queryDownloadTaskModelByResourceId(resourceId: resourceId)
        if(taskModel == nil ){
            print("Repository:queryFileState::taskModel is nil")
        }
        result.statusCode = taskModel == nil ? -6 : 1
        result.reason = taskModel == nil ? "Task not create yet" : ""
        result.current = taskModel?.currentSize.int64Value ?? 0
        result.total = taskModel?.totalSize.int64Value ?? Int64.max
        if taskModel != nil {
            switch taskModel?.status.intValue {
            case DownloadTaskModel.STATUS_PENDDING:
                print("queryState:STATUS_PENDDING")
                result.statusCode = 2
            case DownloadTaskModel.STATUS_RUNNING:
                print("queryState:STATUS_RUNNING")
                result.statusCode = 3
            case DownloadTaskModel.STATUS_PAUSE:
                print("queryState:STATUS_PAUSE")
                result.statusCode = 4
            case DownloadTaskModel.STATUS_SUCCESSFUL:
                print("queryState:STATUS_SUCCESSFUL")
//                这里要判断文件存在 校验MD5等一系列操作
                let location = taskModel?.location
                var realLocation = rootDirectory.appending("/\(location!)")
                if realLocation != nil { print("assert:\(realLocation)")}
                if realLocation == nil || !FileManager.default.fileExists(atPath:realLocation){
                    result.statusCode = -4
                    result.reason = "File is not exists"
                } else {
                    if mHash != nil {
                        let fileMd5 = realLocation.toMd5()
                        if mHash! == fileMd5 {
                            result.statusCode = 0
                        } else {
                            result.statusCode = -2
                            result.reason = "md5 hash error accept: \(mHash!), hash of file: "
                        }
                    } else {
                        if downloadUri == taskModel?.uri {
                            result.statusCode = 0
                        } else {
                            result.statusCode = -3
                            result.reason = "source uri changed:accept:\(downloadUri),source:\(taskModel?.uri)"
                        }
                    }
                    if result.statusCode == 0 { result.filePath = taskModel?.location}
                }
            case DownloadTaskModel.STATUS_FAILED:
                result.statusCode = -1
                result.reason = taskModel?.reason
            default:
                result.statusCode = -1
            }
        } else { result.statusCode = -6 }
        print("\(result.resourceId),\(result.filePath),\(result.statusCode)")
        return result
    }
    func fetchFileById(resourceId: String,downloadUri: String,mHash: String? = nil,location:String? = nil) -> DataFileWrapper {
        print("Repository:fetchFileById::")
        let result = queryFileState(resourceId: resourceId, downloadUri: downloadUri,mHash: mHash)
        print("Repository:fetchFileById::\(result.statusCode)")
        if result.statusCode == -6 {
            createNewTask(resourceId: resourceId, downloadUri: downloadUri, mHash: mHash, location: location)
            let rr = queryFileState(resourceId: resourceId, downloadUri: downloadUri,mHash: mHash)
            result.reason = rr.reason
            result.statusCode = rr.statusCode
            result.filePath = rr.filePath
            result.total = rr .total
            result.current = rr.current
            result.resourceId = rr.resourceId
        }else if result.statusCode == 2 {
//             重试3次 并且任务存在时间超过1天直接设失败
            if let model = queryFileModelByResourceId(id:resourceId).last {
                model.retryCount = model.retryCount + 1
                do {
                    if model.retryCount >= 3 && Date().timeIntervalSince1970 * 1000 - model.created_at.doubleValue > 86400{
                        if let taskModel = queryDownloadTaskModelByResourceId(resourceId: resourceId){
                            taskModel.status = NSNumber(value:DownloadTaskModel.STATUS_FAILED)
                                try taskModel.save()
                                
                        }
                    }
                try model.save()
                } catch {
                    print(error)
                }
            }
        }
        else if result.statusCode > 0{ }
        else if result.statusCode < 0{
            if result.filePath != nil   {
                deleteFile(location: result.filePath)
            }
            createNewTask(resourceId: resourceId, downloadUri: downloadUri, mHash: mHash, location: location)
        }
        return result
    }
    private func createNewTask(resourceId: String,downloadUri: String,mHash: String? = nil,location:String? = nil){
        print("Repository:createNewTask::")
        let id = insertDownloadManager(downloadUri: downloadUri, hash:mHash, location: location)
        insertDataBase(resourceId: resourceId, downloadId: id)
    }
    
    func deleteFileById(resourceId:String) -> Void{
        guard let downloadModel = queryDownloadTaskModelByResourceId(resourceId: resourceId) else {
            return
        }
        let location = downloadModel.location
        
        print("deleteFileById:\(downloadModel.status.intValue) location:\(location)")
//      删除文件
        if downloadModel.status.intValue == DownloadTaskModel.STATUS_SUCCESSFUL {
            print("deleteFileById:1")
            deleteFile(location:location)
        }else{
            print("deleteFileById:2")
            downloadManager.cancel(id: downloadModel.id!.intValue)
        }
    }
    
    func deleteFile(location:String?) -> Void {
        guard let location = location else {
            return
        }
        var rootDirectory = NSSearchPathForDirectoriesInDomains(FileManager.SearchPathDirectory.cachesDirectory, FileManager.SearchPathDomainMask.userDomainMask, true).first!
        var bundleDirectory = NSSearchPathForDirectoriesInDomains(FileManager.SearchPathDirectory.applicationSupportDirectory,FileManager.SearchPathDomainMask.userDomainMask,true).first!.appending("/bundles")
        var local = location.starts(with: "/") ? location : "/\(location)"
        var rootDirectoryFiles = rootDirectory.appending(local)
        var bundleDirectoryFiles = location.starts(with: "/bundles") ? local : bundleDirectory.appending(local)
        
        internalDeleteFile(filePath: rootDirectoryFiles)
        internalDeleteFile(filePath: bundleDirectoryFiles)
    }
    private func internalDeleteFile(filePath:String?){
        guard let path = filePath else{
            return
        }
        print("deleteFile:\(path)")
        if !FileManager.default.fileExists(atPath: path) {return}
        do{
            try FileManager.default.removeItem(atPath: path)
        } catch {
            print(error)
        }
    }
    private func insertDownloadManager(downloadUri:String,hash:String? = nil,location: String? = nil) -> Int64 {
        print("Repository:insertDownloadManager::")
        var m = location == nil ? "" : location!
        if m.last == "/" {
            do{
                try FileManager.default.createDirectory(atPath: m, withIntermediateDirectories: true)
            }catch {
                print(error)
            }
        }
        if m == "" || m.last == "/" {
            m += URL(string:downloadUri)!.lastPathComponent
        }
        if m.first == "/" { m.removeFirst() }
        return downloadManager.enqueue(url: downloadUri, location: m)
    }
    
    
    private func insertDataBase(resourceId:String,downloadId:Int64,hash:String? = nil ) ->Void{
        let model = DownloadFileModel()
        model.resourceId = resourceId
        model.downloadmanagerId = NSNumber(value:downloadId)
        if hash != nil { model.fileHash = hash! }
        do {
            try! model.save()
        } catch {
            print (error)
        }
    }
    
    private func queryDownloadTaskModelByResourceId(resourceId:String) -> DownloadTaskModel?{
        return queryDao.queryDownloadTaskModelByResourceId(resourceId)
    }
    private func queryFileModelByResourceId(id:String) -> [DownloadFileModel] {
        return queryDao.queryFileModelByResourceId(id)
    }
}
