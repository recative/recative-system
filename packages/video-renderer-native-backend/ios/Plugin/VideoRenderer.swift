import Foundation
import ffmpegkit
import UIKit
import SwiftState



@objc public class VideoRenderer: NSObject {
    var property : RenderInfo? = nil
    override init(){
       super.init()
    }
    public func createTask(){
        
    }
    public func executeRaw(_ cmd:String)-> FFmpegSession {
        return FFmpegKit.execute(cmd)
    }
    
    private func fetchFileDirectory() -> String {
//        let directory = NSHomeDirectory().app
        return ""
    }
    private func outputDirectory(filePath:String){
        var isExists = UIVideoAtPathIsCompatibleWithSavedPhotosAlbum(filePath)
        if (!isExists) {
            UISaveVideoAtPathToSavedPhotosAlbum(filePath, self,
                                                #selector(video), nil)
        } else {
//            NSLog("", <#T##args: CVarArg...##CVarArg#>)
        }
    }
//    private func didFinishSavingWithError(video:String,didFinishSavingWithError:NSError){
//
//    }
    
    @objc func video(_ videoPath: String?,
               didFinishSavingWithError error: Error?,
               contextInfo: UnsafeMutableRawPointer?) {
        
    }
}
