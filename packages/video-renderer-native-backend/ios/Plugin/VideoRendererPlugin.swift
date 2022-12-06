import Foundation
import Capacitor
import ffmpegkit
import SwiftState

protocol RenderListener{
   func onRenderCompile(task:TaskModel)
}
/**
 * Please read the Capacitor iOS Plugin Development Guide
 * here: https://capacitorjs.com/docs/plugins/ios
 */
@objc(VideoRendererPlugin)
public class VideoRendererPlugin: CAPPlugin {
    
    private var queue = Stack<TaskModel>()
    private var timer:Timer? = nil
    private let endSuffix = ".raw"
    
    private var mapping = [String:FFmpegSession]()
    private var sessionMapping = [FFmpegSession:String]()
    
//    private var renderSession = [String:CAPPluginCall]()
    
   
    let MAX_DEFAULT_RENDER_COUNT = 60 //Maximum single rendering of 2 seconds of video content
    
    let machine = StateMachine<MachineState,NoEvent>(state:MachineState.NoWork) { _machine in
        _machine.addRoute(MachineState.NoWork => MachineState.FetchTask)
        _machine.addRoute(MachineState.Error => MachineState.FetchTask)
        _machine.addRoute(MachineState.Complete => MachineState.FetchTask)
        
        _machine.addRoute(MachineState.FetchTask => MachineState.NoWork)
        _machine.addRoute(MachineState.FetchTask => MachineState.Rendering)
        _machine.addRoute(MachineState.FetchTask => MachineState.Error)
        
        _machine.addRoute(MachineState.Rendering => MachineState.Complete)
        _machine.addRoute(MachineState.Rendering => MachineState.Error)
        _machine.addRoute(MachineState.Rendering => MachineState.Rendering)
        _machine.addRoute(MachineState.Rendering => MachineState.FetchTask)
    }
    
    var inited = false
    
    @objc func createTask(_ call: CAPPluginCall){
        print("videorenderer:createTask::json:\(call.options)")
        let renderTaskId = call.getString("renderTaskId")
       
        let audioFile = call.getString("audioFileName")
        let outputName = call.getString("outputFileName")!
        let fps = call.getInt("fps",30)
        
        guard let renderTaskId = renderTaskId else {
            call.reject("renderTaskId is nil")
            return
        }
        guard let resolutaion = call.getArray("resolution",Int.self), resolutaion.count == 2 else {
            call.reject("resolutaion error")
            return
        }
        var props = createNewRenderTask(renderTaskId,resolutaion,fps,outputName,audioFile)
        queue.push(props)
        print("videorenderer:createTask::1")
        if (!inited) {
            machine.addHandler( .any => MachineState.FetchTask) { context in
                guard let task = self.queue.peek else {
                    self.machine.tryState(MachineState.NoWork)
                    return
                }
                switch task.status{
                case 0:
                    self.clearTask()
                    self.machine.tryState(MachineState.FetchTask)
                case 1:
                    self.machine.tryState(MachineState.Rendering,userInfo:task)
                    print("")
                case 2:
                    self.machine.tryState(MachineState.Rendering,userInfo:task)
                case -1:
                    self.clearTask()
                    self.machine.tryState(MachineState.FetchTask)
                    print("")
                default:
                    self.machine.tryState(MachineState.Error,userInfo: task)
                    print("")
                }
            }
            machine.addHandler(MachineState.FetchTask => MachineState.Rendering){ context in
                var task = context.userInfo as! TaskModel
                self.isLocked = true
                switch task.status{
                case 0:
                    print("")
                case 1:
                    self.image2Video(task)
//                    self.machine.tryState(MachineState.Rendering,userInfo: task)
                case 2:
                    self.concat(task)
                default:
                    self.machine.tryState(MachineState.Error,userInfo: task)
                }
                self.isLocked = false
            }
            machine.addHandler(MachineState.Rendering => MachineState.Rendering){ context in
                var task = context.userInfo as! TaskModel
                self.isLocked = true
                switch task.status{
                case 1:
                    self.image2Video(task)
//                    self.machine.tryState(MachineState.Rendering,userInfo: task)
                case 2:
                    self.concat(task)
                case 3:
                    self.concat(task)
                default:
                    self.machine.tryState(MachineState.Error,userInfo: task)
                }
                self.isLocked = false
            }
            machine.addHandler(MachineState.FetchTask => MachineState.Error){ context in
//                self.taskModel?.status = -1
            }
            machine.addHandler(MachineState.Rendering => MachineState.Complete){ context in
//                self.machine.tryState(MachineState.FetchTask)
            }
            machine.addHandler(MachineState.Rendering => MachineState.Error){context in
//                self.machine.tryState(MachineState.FetchTask)
            }
            machine.addHandler(.any => MachineState.NoWork){ context in
                self.resetTimer()
                self.isLocked = false
            }
            
            inited = true
        }
        if(timer == nil){
// like android looper  should start a new thread and run it
            DispatchQueue.global().async{
                self.timer = Timer.scheduledTimer(timeInterval: 5, target: self, selector: #selector(self.dispatchTask), userInfo: nil, repeats: true)
                var looper = RunLoop.current
                looper.add(self.timer!, forMode: RunLoop.Mode.default)
                looper.run()
            }
        }
        call.resolve()
    }
    var delayCount = 0
    var isLocked = false
    @objc func dispatchTask(){
        print("videorenderer:dispatchTask::\(isLocked)")
        if (self.delayCount < 30){
            delayCount += 5
            return
        }
        if (isLocked){
            return
        }
        self.machine.tryState(MachineState.FetchTask)
    }
    @objc func finalize(_ call:CAPPluginCall){
        var props = queue.peek
        guard let props = props else {
            call.reject("Finalize must be called after createQueue")
            return
        }
        guard let renderInfo = props.renderInfo else {
            call.reject("error")
            return
        }
        guard let renderTaskId = call.getString("renderTaskId") else {
            call.reject("renderTaskId is nil")
            return
        }
        let resolutation = renderInfo.resolutaion
        let fps = renderInfo.fps
        let outputFileName = renderInfo.outputFileName
        
        var param0:String? = nil
        let audioFile = props.renderInfo?.audioFile
        if (audioFile != nil) {
            param0 = "-i \(audioFile)"
        }
        props.isTransportFinished = true
        props.call = call
    }
    private func renderBody(_ renderTaskId:String,url:String?,status:Int,message:String?)->[String:Any]{
        var result = [String:Any]()
        var state = [String:Any]()
        var renderTask = [String:Any]()
        
        state["status"] = status
        state["message"] = message ?? ""
        
        renderTask["renderTaskId"] = renderTaskId
        renderTask["url"] = url ?? ""
        
        result["renderTask"] = renderTask
        result["status"] = state
        return result
    }
    private func notifyListener(result:[String:Any]){
        if(hasListeners("onRenderComplete")){
            notifyListeners("onRenderComplete", data:result)
        }
    }
    @objc func cancelTask(_ call:CAPPluginCall){
        guard let renderTaskId = call.getString("renderTaskId") else{
            call.reject("renderTaskId must not be nil")
            return
        }
        do{
            if(timer != nil && timer!.isValid){
                self.resetTimer()
            }
            clearDirecotry(renderTaskId)
            call.resolve()
        }catch{
            call.reject(error.localizedDescription)
        }
    }
    
    private func createNewRenderTask(_ id:String,_ resolutaion : [Int], _ fps:Int = 30,_ outputName:String,_ audioFile:String? = nil) -> TaskModel{
        print("videorenderer:createNewRenderTask::fps:\(fps)")
        var properties = RenderInfo()
        properties.renderTaskId = id
        properties.resolutaion = resolutaion
        properties.fps = fps
        properties.outputFileName = outputName
        properties.audioFile = audioFile
        
        var result = TaskModel()
        result.renderInfo = properties
        result.status = 1
        result.startTime = NSDate()
        return result
    }
}


extension VideoRendererPlugin{
    fileprivate func createDirectoryByTaskId(_ task:String){
        let rootDirectory = NSSearchPathForDirectoriesInDomains(FileManager.SearchPathDirectory.cachesDirectory, FileManager.SearchPathDomainMask.allDomainsMask, true).first!
        let directory = rootDirectory.appending(task)
        print("videorender:createDirectoryByTaskId::\(directory)")
        if !FileManager.default.fileExists(atPath: directory) {
            do {
                try FileManager.default.createDirectory(atPath: directory, withIntermediateDirectories: true)
            } catch {
                print(error)
            }
        }
    }
    fileprivate func clearDirecotry(_ taskId:String){
        let directory = FileManager.default.urls(for: FileManager.SearchPathDirectory.cachesDirectory, in: .allDomainsMask).first!
            .appendingPathComponent("/\(taskId)", isDirectory: true)
        do{
            try FileManager.default.removeItem(at: directory)
        }catch{
            print(error)
        }
    }
}

extension VideoRendererPlugin{
        fileprivate func image2Video(_ task:TaskModel){
        print("videorenderer:image2video::")
         let index = task.index
         let videoInfo = task.renderInfo
         let outputName = "\(videoInfo!.outputFileName)"
         let taskId = queue.peek!.renderInfo!.renderTaskId
        
         var buffer = appendJ(max: MAX_DEFAULT_RENDER_COUNT)
         var recordFiles = task.recordFiles

        //  Check if there are any files left. If there are, synthesize. If not, end.

         var count = buffer?.count ?? 0
         print("videorenderer:image2video::count:\(count)")
         if(count > 0){
             // image 2 video
             var session = doImage2Video(videoInfo!.resolutaion[0], videoInfo!.resolutaion[1],
                                         index:index,fps:videoInfo!.fps, outputName: outputName, count: count,renderTaskId:taskId)
             if(session.getReturnCode().isValueSuccess()){
                 //   write to txt
                 var rootDir = NSSearchPathForDirectoriesInDomains(.cachesDirectory, FileManager.SearchPathDomainMask.allDomainsMask, true).first!
                 rootDir.append("/videoRenderer/\(taskId)")
                 print("videorenderer:image2video::entryAppendFile:::")
                 appendFile("\(index).mp4", rootDirectory: URL(string:rootDir)!)
                 // =================Record the generated intermediate files=======================
                 var copy = rootDir
                 copy.append("/\(index).mp4")
                 recordFiles.append(copy)
                 // =================Record the generated intermediate files=======================
                 //                cursor++
                 task.index += count
                 //                delete frame file
                 let m = [Int](index..<task.index).map{ it -> URL in
                     var directory = NSSearchPathForDirectoriesInDomains(.cachesDirectory, FileManager.SearchPathDomainMask.allDomainsMask, true).first!
                     directory.append("/videoRenderer/\(taskId)")
                     directory.append("/\(it).raw")
                     return URL(string: directory)!
                 }
                 deleteRawFiles(rawFiles: m)
             }else {
                 self.machine.tryState(MachineState.Error)
             }
         } else {
             print("videorenderer:image2video::isTransportFinished\(task.isTransportFinished)")
             if(task.isTransportFinished){
                 task.status = 2
             }

//             if(task.status == 2){
//
//                 concat(task)
//             }else{
//             todo: skipAndCount(task)
//             }
     }
    }
    fileprivate func concat(_ task:TaskModel){
        if (task.status == 2){
            // combine videos
            var rootDir = NSSearchPathForDirectoriesInDomains(.cachesDirectory, FileManager.SearchPathDomainMask.allDomainsMask, true)
            var rootCache = rootDir.first!
            var outputRoot = rootDir.first!
            var audioFileRoot = rootDir.first!
            var audioOutputRoot = rootDir.first!
            var taskId = task.renderInfo!.renderTaskId
           
            let videoInfo = task.renderInfo
            let outputName = "\(videoInfo!.outputFileName)"
            var recordFiles = task.recordFiles
            
            rootCache.append("/videoRenderer/\(taskId)")
            rootCache.append("/intermediate.txt")
            audioOutputRoot.append("/videoRenderer/\(taskId)/audio.aac")
            
            outputRoot.append("/\(outputName)")
            
            audioFileRoot.append("/\(videoInfo!.audioFile!)")
            guard let call = task.call else {
                machine.tryState(MachineState.Error,userInfo: task)
                return
            }
            guard let convertSession = doCodecAudio(audioFileName: audioFileRoot, outputPath: audioOutputRoot) else {
                call.reject("convert audio failed")
                machine.tryState(MachineState.Error,userInfo: task)
                return
            }
            guard let ffmpegSession = doConcatFiles(fileName: rootCache, audioFileName: audioOutputRoot, outputName: outputRoot) else {
                call.reject("convert audio failed")
                machine.tryState(MachineState.Error,userInfo: task)
                return
            }
           
            guard let returnCode = ffmpegSession.getReturnCode() else {
                call.reject("return code is nil")
                machine.tryState(MachineState.Error,userInfo: task)
                return
            }
            do{
                for item in recordFiles {
                   try FileManager.default.removeItem(at: URL(string:"file://\(item)")!)
                }
            }catch{
                print(error)
            }
            
            if(returnCode.isValueSuccess()){
                var result = self.renderBody(taskId, url: outputRoot, status: 0, message: "")
                call.resolve(result)
                task.status = 0
                machine.tryState(MachineState.Complete,userInfo: task)
                print("videoRenderer:result::\(result)")
            }else if(returnCode.isValueError()){
                var message = ffmpegSession.getLogsAsString()
                call.resolve(self.renderBody(taskId, url: nil, status: -1, message: message))
                machine.tryState(MachineState.Error,userInfo: task)
            }else{
                call.resolve(self.renderBody(taskId, url: nil, status: -2, message: "user canceled" ))
                machine.tryState(MachineState.Error,userInfo: task)
            }
        }
    }
     /**
      * record raw files and sort it
      */
     fileprivate func appendJ(max : Int?) -> [String]? {
         var directory = NSSearchPathForDirectoriesInDomains(FileManager.SearchPathDirectory.cachesDirectory, FileManager.SearchPathDomainMask.allDomainsMask, true).first!
         
         let task = queue.peek
         let taskId = task!.renderInfo!.renderTaskId
         directory.append("/videoRenderer/\(taskId)")
         print("imternial file :\(directory)")
         var count = 0
         do{
             let content = try FileManager.default.contentsOfDirectory(atPath: directory)
             var removedUrl = [String]()
             print("videorenderer:appendJ::\(content.count)")
             for item in content {
                 var revalUrl = URL(string: directory)!.relativePath + "/\(item)"
                 if(revalUrl.hasSuffix(".raw") && count < max ?? MAX_DEFAULT_RENDER_COUNT){
                     removedUrl.append(revalUrl)
                     count += 1
                 }
             }
             if(count > 1){
 //                desc order
                 removedUrl.sort { first, second in
                     var f = URL(string: first)!.lastPathComponent
                     var s = URL(string: second)!.lastPathComponent
                     var m = f.substring(to:f.firstIndex(of:".")!)
                     var l = s.substring(to:s.firstIndex(of:".")!)
                     return (Int(m)! - Int(l)!) < 0
                 }
             }
             return removedUrl
         }catch{
             print("errorrrr:::\(error)")
             return nil
         }
     }
     fileprivate func deleteRawFiles(rawFiles:[URL]){
         print("delete item \(rawFiles)")
             for item in rawFiles {
                 do{
                     try FileManager.default.removeItem(atPath: item.relativePath)
                 }catch{
                     print(error)
                 }
             }
     }
     fileprivate func appendFile(_ content:String,rootDirectory:URL){
         print("videorenderer:appendFile::")
         var roo = rootDirectory.relativePath
         roo.append("/intermediate.txt")
         let rootPath = roo
         let headSuffix = "file '\(content)' \r\n"
         do{
             print("videorenderer:appendFile::0")
             if(!FileManager.default.fileExists(atPath: rootPath)){
                 print("videorenderer:appendFile::createFile")
                 try FileManager.default.createFile(atPath: rootPath,contents: nil)
             }
             print("videorenderer:appendFile::exists")
             let fileHandler = FileHandle(forWritingAtPath:rootPath)
             
             try fileHandler?.seekToEndOfFile()
             
             try fileHandler?.write(headSuffix.data(using: .utf8)!)
             
             try fileHandler?.closeFile()
             print("file write closed()")
             
         }catch {
             print(error)
         }
     }
    fileprivate func doImage2Video(_ width:Int,_ height:Int,index:Int,fps:Int=30,outputName:String,count:Int,renderTaskId:String)->FFmpegSession{
         
         var m = NSSearchPathForDirectoriesInDomains(.cachesDirectory, FileManager.SearchPathDomainMask.allDomainsMask, true).first!
         var d = NSSearchPathForDirectoriesInDomains(.cachesDirectory, FileManager.SearchPathDomainMask.allDomainsMask, true).first!
         
         m.append("/videoRenderer/\(renderTaskId)")
         d.append("/videoRenderer/\(renderTaskId)")
         print("videorenderer:doImage2Video::")
         let endFrames = count
         let executeC = "-f image2 -video_size \(width)x\(height) -pixel_format rgba -framerate 30 -start_number \(index) -i \(m)/%d.raw -frames:v \(endFrames) -c:v h264 -vf \"fps=\(fps), format=yuv420p\" \(d)/\(index).mp4 "
         print("executeCmd:\(executeC)")
         return FFmpegKit.execute(executeC)
     }
    fileprivate func doCodecAudio(audioFileName:String,outputPath:String)->FFmpegSession?{
        let convertCmd = "-i \(audioFileName) \(outputPath)"
        guard let session = FFmpegKit.execute(convertCmd) else{
            return nil
        }
        return session
    }
     fileprivate func doConcatFiles(fileName:String,audioFileName:String,outputName:String)->FFmpegSession?{
        resetTimer()
        let cmd = "-f concat -safe 0 -i \(fileName) -i \(audioFileName) -c copy \'\(outputName)\'"
        print("concat:\(cmd)")
        return FFmpegKit.execute(cmd)
     }
    fileprivate func resetTimer(){
        self.timer?.invalidate()
        self.timer = nil
    }
    fileprivate func clearTask(){
        self.queue.pop()
    }
}
