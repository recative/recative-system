//
//  Models.swift
//  Plugin
//
//  Created by Sun on 2022/8/3.
//  Copyright © 2022 Max Lynch. All rights reserved.
//

import Foundation
import Capacitor

class TaskModel{
    var startTime:NSDate=NSDate()
    // 0:success;1:running;2:finished but rendering;-1:failed
    var status:Int = 0
    var isTransportFinished:Bool = false
    var message:String = ""
    var renderInfo:RenderInfo? = nil
    var index:Int=0
    var recordFiles = [String]()
    var call:CAPPluginCall? = nil
}
class RenderInfo{
    var renderTaskId:String = ""
    var resolutaion:[Int]=[0,0]
    var fps:Int = 24
    var outputFileName: String = ""
    var audioFile: String? = ""
}
