//
//  DownloadManagerImpls.swift
//  Plugin
//
//  Created by Sun on 2022/3/15.
//  Copyright © 2022 Max Lynch. All rights reserved.
//

import Foundation

class DownloadObject:NSObject{
    var completionBlock: JBCZDownloadManager.DownloadCompletionBlock
    let downloadTask: URLSessionDownloadTask
    let directoryName: String?
    let fileName:String?
    let progressBlock:JBCZDownloadManager.DownloadProgressBlock?
    init(downloadTask: URLSessionDownloadTask,
         progressBlock: JBCZDownloadManager.DownloadProgressBlock?,
         completionBlock: @escaping JBCZDownloadManager.DownloadCompletionBlock,
         fileName: String?,
         directoryName: String?) {
        
        self.downloadTask = downloadTask
        self.completionBlock = completionBlock
        self.fileName = fileName
        self.directoryName = directoryName
        self.progressBlock = progressBlock
    }
}



class JBCZDownloadManagerImpl:DownloadManager {
    lazy var engine=JBCZDownloadManager.shared
    func enqueue(url: String, location: String?,onComplete:@escaping (Error?,String?) -> Void,onProgress:@escaping(Int64,Int64) -> Void ) -> String {
        let withRequest=URLRequest(url:URL(string:url)!)
        let fileName = URL(string:location!)?.lastPathComponent
        var directory = URL(string:location!)?.deletingLastPathComponent().absoluteString
        if directory! == "./" {directory = nil}
        return engine.downloadFile(withRequest:withRequest,
                            inDirectory: directory,
                            withName: fileName,
                            shouldDownloadInBackground: false,
                            onProgress: { current,total in
                                onProgress(current,total)
                                },
                            onCompletion:{ error,fileUri in
                                onComplete(error,fileUri?.path)
                            }
        ) ?? ""
    }
    
    func cancel(url:String) {
        for (currentUrl) in engine.currentDownloads(){
            if(url == currentUrl){
                engine.cancelDownload(forUniqueKey:url)
            }
            return
        }
    }
}
class JBCZDownloadManager:NSObject{
    
    public typealias DownloadCompletionBlock = (_ error : Error?, _ fileUrl:URL?) -> Void
    public typealias DownloadProgressBlock = (_ current : Int64,_ total: Int64) -> Void
    public typealias BackgroundDownloadCompletionHandler = () -> Void
    
    // MARK :- Properties
    public static let shared: JBCZDownloadManager = { return JBCZDownloadManager() }()
    private var session: URLSession!
    private var ongoingDownloads: [String : DownloadObject] = [:]
    private var backgroundSession: URLSession!
    
    public var backgroundCompletionHandler: BackgroundDownloadCompletionHandler?
    public var showLocalNotificationOnBackgroundDownloadDone = false
    public var localNotificationText: String?

//    public static let shared: SDDownloadManager = { return SDDownloadManager() }()

    //MARK:- Public methods
    
    public func downloadFile(withRequest request: URLRequest,
                            inDirectory directory: String? = nil,
                            withName fileName: String? = nil,
                            shouldDownloadInBackground: Bool = false,
                            onProgress progressBlock:@escaping DownloadProgressBlock,
                            onCompletion completionBlock:@escaping DownloadCompletionBlock) -> String? {
        if let _ = self.ongoingDownloads[(request.url?.absoluteString)!] {
            debugPrint("Already in progress")
            return nil
        }
        var downloadTask: URLSessionDownloadTask
        downloadTask = shouldDownloadInBackground ? self.backgroundSession.downloadTask(with: request): self.session.downloadTask(with: request)
        let download = DownloadObject(downloadTask: downloadTask,
                                        progressBlock: progressBlock,
                                        completionBlock: completionBlock,
                                        fileName: fileName,
                                        directoryName: directory)
        let key = (request.url?.absoluteString)!
        self.ongoingDownloads[key] = download
        downloadTask.resume()
        return key;
    }
    
    public func currentDownloads() -> [String] {
        return Array(self.ongoingDownloads.keys)
    }
    
    public func cancelAllDownloads() {
        for (_, download) in self.ongoingDownloads {
            let downloadTask = download.downloadTask
            downloadTask.cancel()
        }
        self.ongoingDownloads.removeAll()
    }
    
    public func cancelDownload(forUniqueKey key:String?) {
        let downloadStatus = self.isDownloadInProgress(forUniqueKey: key)
        let presence = downloadStatus.0
        if presence {
            if let download = downloadStatus.1 {
                download.downloadTask.cancel()
                self.ongoingDownloads.removeValue(forKey: key!)
            }
        }
    }
    
    public func isDownloadInProgress(forKey key:String?) -> Bool {
        let downloadStatus = self.isDownloadInProgress(forUniqueKey: key)
        return downloadStatus.0
    }
    
    //MARK:- Private methods
    
    private override init() {
        super.init()
        let sessionConfiguration = URLSessionConfiguration.default
        self.session = URLSession(configuration: sessionConfiguration, delegate: self, delegateQueue: nil)
        let backgroundConfiguration = URLSessionConfiguration.background(withIdentifier: Bundle.main.bundleIdentifier!+".background")
        self.backgroundSession = URLSession(configuration: backgroundConfiguration, delegate: self, delegateQueue: OperationQueue())
    }

    private func isDownloadInProgress(forUniqueKey key:String?) -> (Bool, DownloadObject?) {
        guard let key = key else { return (false, nil) }
        for (uniqueKey, download) in self.ongoingDownloads {
            if key == uniqueKey {
                return (true, download)
            }
        }
        return (false, nil)
    }
}

extension JBCZDownloadManager : URLSessionDelegate, URLSessionDownloadDelegate {
    // MARK:- Delegates
    public func urlSession(_ session: URLSession,
                             downloadTask: URLSessionDownloadTask,
                             didFinishDownloadingTo location: URL) {
        let key = (downloadTask.originalRequest?.url?.absoluteString)!
        if let download = self.ongoingDownloads[key]  {
            if let response = downloadTask.response {
                let statusCode = (response as! HTTPURLResponse).statusCode
                
                guard statusCode < 400 else {
                    let error = NSError(domain:"HttpError", code:statusCode, userInfo:[NSLocalizedDescriptionKey : HTTPURLResponse.localizedString(forStatusCode: statusCode)])
                    OperationQueue.main.addOperation({
                        download.completionBlock(error,nil)
                    })
                    return
                }
                let fileName = download.fileName ?? downloadTask.response?.suggestedFilename ?? (downloadTask.originalRequest?.url?.lastPathComponent)!
                let directoryName = download.directoryName
                
                let fileMovingResult = moveFile(fromUrl: location, toDirectory: directoryName, withName: fileName)
                let didSucceed = fileMovingResult.0
                let error = fileMovingResult.1
                let finalFileUrl = fileMovingResult.2
                
                OperationQueue.main.addOperation({
                    (didSucceed ? download.completionBlock(nil,finalFileUrl) : download.completionBlock(error,nil))
                })
            }
        }
        self.ongoingDownloads.removeValue(forKey:key)
    }
    public func urlSession(_ session: URLSession,
                             task: URLSessionTask,
                             didCompleteWithError error: Error?) {
        if let error = error {
            print("333:error")
            let downloadTask = task as! URLSessionDownloadTask
            let key = (downloadTask.originalRequest?.url?.absoluteString)!
            if let download = self.ongoingDownloads[key] {
                OperationQueue.main.addOperation({
                    download.completionBlock(error,nil)
                })
            }
            self.ongoingDownloads.removeValue(forKey:key)
        }
    }
    public func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didWriteData bytesWritten: Int64, totalBytesWritten: Int64, totalBytesExpectedToWrite: Int64) {
        let key = (downloadTask.originalRequest?.url?.absoluteString)!
        if let download = self.ongoingDownloads[key] {
            download.progressBlock?(totalBytesWritten,totalBytesExpectedToWrite)
        }
    }
    private func moveFile(fromUrl url:URL,
                         toDirectory directory:String? ,
                         withName name:String) -> (Bool, Error?, URL?) {
        var newUrl:URL
        if let directory = directory {
            let directoryCreationResult = self.createDirectoryIfNotExists(withName: directory)
            guard directoryCreationResult.0 else {
                return (false, directoryCreationResult.1, nil)
            }
            newUrl = self.cacheDirectoryPath().appendingPathComponent(directory).appendingPathComponent(name)
        } else {
            newUrl = self.cacheDirectoryPath().appendingPathComponent(name)
        }
        if FileManager.default.fileExists(atPath:newUrl.absoluteString) {
            return (true, nil, newUrl)
        }
        do {
            try FileManager.default.moveItem(at: url, to: newUrl)
            return (true, nil, newUrl)
        } catch {
//           文件已存在的情况 因为多线程所以只能在 catch 这里处理
            if error.localizedDescription.lowercased().contains("because an item with the same name already exists"){
               return  (true, nil, newUrl)
           } else {
            return (false, error, nil)
           }
        }
    }
    
    private func cacheDirectoryPath() -> URL {
        let cachePath = NSSearchPathForDirectoriesInDomains(.cachesDirectory, .userDomainMask, true)[0]
        return URL(fileURLWithPath: cachePath)
    }
    
    private func createDirectoryIfNotExists(withName name:String) -> (Bool, Error?)  {
        let directoryUrl = self.cacheDirectoryPath().appendingPathComponent(name)
        if FileManager.default.fileExists(atPath: directoryUrl.path) {
            return (true, nil)
        }
        do {
            try FileManager.default.createDirectory(at: directoryUrl, withIntermediateDirectories: true, attributes: nil)
            return (true, nil)
        } catch  {
            return (false, error)
        }
    }
}
