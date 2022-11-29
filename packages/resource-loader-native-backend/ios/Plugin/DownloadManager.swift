//
//  DownloadManager.swift
//  Plugin
//
//  Created by Sun on 2022/2/23.
//  Copyright © 2022 Max Lynch. All rights reserved.
//

import Foundation
import ActiveSQLite
import SwiftState

class DownloadTaskModel : ASModel {
    
     var uri:String = ""
//    1:pendding;2:running;4:pause;8:successful;16:failed
     var status = NSNumber(1)
     var reason:String = ""
     var location:String = ""
     var fk:String=""
//    byte
    var totalSize = NSNumber(value:Int64.max)
    var currentSize = NSNumber(value:0)
    
    static let STATUS_PENDDING = 0xb1 << 0
    static let STATUS_RUNNING = 0xb1 << 1
    static let STATUS_PAUSE = 0xb1 << 2
    static let STATUS_SUCCESSFUL = 0xb1 << 3
    static let STATUS_FAILED = 0xb1 << 4
}

enum DownloadState: StateType{
    case NoWork,FetchTask,Downloading,Complete,Error
}
protocol DownloadManager {
    func enqueue(url:String,location:String?,onComplete:@escaping (Error?,String?) -> Void,onProgress:@escaping(Int64,Int64) -> Void) -> String
    func cancel(url:String)
}

class Engine{
    var en:DownloadManager?
    let machine = StateMachine<DownloadState,NoEvent>(state:DownloadState.NoWork) { _machine in
        _machine.addRoute(DownloadState.NoWork => DownloadState.FetchTask)
        _machine.addRoute(DownloadState.Error => DownloadState.FetchTask)
        _machine.addRoute(DownloadState.Complete => DownloadState.FetchTask)
        
        _machine.addRoute(DownloadState.FetchTask => DownloadState.NoWork)
        _machine.addRoute(DownloadState.FetchTask => DownloadState.Downloading)
        
        _machine.addRoute(DownloadState.Downloading => DownloadState.Complete)
        _machine.addRoute(DownloadState.Downloading => DownloadState.Error)
    }
    init(downloadManagerImpl:DownloadManager) {
        self.en=downloadManagerImpl
        machine.addHandler( .any => DownloadState.FetchTask) { context in
            var sourceState = context.fromState
            let model=self.fetchTaskModel()
            print("\(sourceState) => FetchTask")
            if model == nil {
                print("fetchTaskModel:model nil")
                self.machine.tryState(DownloadState.NoWork)
            }else{
                print("fetchTaskModel:\(model?.id)")
                self.machine.tryState(DownloadState.Downloading,userInfo: model)
            }
        }
        
        machine.addHandler(DownloadState.FetchTask => DownloadState.NoWork) { context in
            print("FetchTask => NoWork")
        }
        
        machine.addHandler(DownloadState.FetchTask => DownloadState.Downloading ){ context in
            print("FetchTask => NoWork")
            var model = context.userInfo as! DownloadTaskModel
            model.status = NSNumber(value: DownloadTaskModel.STATUS_RUNNING)
            guard let fk = self.innerEnqueue(url: model.uri, location: model.location,model:model) else {
                self.update(model)
                return
            }
            model.fk = fk
            self.update(model)
        }
        
        machine.addHandler(DownloadState.Downloading  => DownloadState.Complete){ context in
            print("any => Complete")
            let model = context.userInfo as! DownloadTaskModel
            self.update(model)
            self.machine.tryState(DownloadState.FetchTask)
        }
      
        machine.addHandler(DownloadState.Downloading => DownloadState.Error){ context in
            var model = context.userInfo as! DownloadTaskModel
            self.update(model)
            self.machine.tryState(DownloadState.FetchTask)
        }
    }
    private func fetchTaskModel() -> DownloadTaskModel?{
        print("fetchtaskModel")
//        if (filterByState(status: DownloadTaskModel.STATUS_RUNNING) != nil){
//            return nil
//        } else {
//        return filterByState(status:DownloadTaskModel.STATUS_PENDDING).first
//        }
        return filterByState(status:DownloadTaskModel.STATUS_PENDDING).first
    }
    private func update(_ model:DownloadTaskModel){
        do {
            try model.save()
        } catch {
            print(error)
        }
    }
    func cancel(id:Int)->Void{
        let model=DownloadTaskModel.findFirst(["id":id])
        if(model == nil){return}
        model?.status = NSNumber(value:DownloadTaskModel.STATUS_FAILED)
        model?.reason = "user cancel"
        en?.cancel(url:model!.uri)
        self.machine.tryState(DownloadState.Error,userInfo:model!)
    }
    func innerEnqueue(url:String,location:String,model:DownloadTaskModel)-> String?{
        return en?.enqueue(url: url, location:location, onComplete:{error,filePath in
            if error != nil {
                model.status = NSNumber(value:DownloadTaskModel.STATUS_FAILED)
                model.reason = "\(error)"
                self.machine.tryState(DownloadState.Error,userInfo:model)
            }else if filePath != nil {
                model.status = NSNumber(value:DownloadTaskModel.STATUS_SUCCESSFUL)
                self.machine.tryState(DownloadState.Complete,userInfo:model)
            }
        },onProgress: {current,total in
            model.totalSize = NSNumber(value:total)
            model.currentSize = NSNumber(value:current)
            model.status = NSNumber(value:DownloadTaskModel.STATUS_RUNNING)
            self.update(model)
        })
    }
    func enqueue(url:String,location:String)->Int64{
        print("DownloadManager:enqueue::")
        let model=DownloadTaskModel()
        model.uri = url
        model.location = location
        model.status = NSNumber(value:DownloadTaskModel.STATUS_PENDDING)
        do{
            let key = URL(string:url)!.absoluteString
            model.fk = key
            try model.save()
            print("save model:\(model.id!.intValue)")
            if self.machine.state == DownloadState.NoWork {  self.machine.tryState(DownloadState.FetchTask)}
            return model.id!.int64Value
        }catch {
            print(error)
            return -1
        }
    }
    func filterById(ids:[Int]) -> [DownloadTaskModel]{
        let results = DownloadTaskModel.findAll().filter{m in
            for (uniqueKey) in ids {
                if m.id!.intValue == uniqueKey {
                    return true
                }
            }
            return false
        }
        return results
    }
    func filterByState(status:Int) -> [DownloadTaskModel]{
        let results = DownloadTaskModel.findAll().filter{m in
            return m.status.intValue == status
        }
        return results
    }
}


class Engine2{
    var en:DownloadManager?
    init(downloadManagerImpl:DownloadManager) {
        en = downloadManagerImpl
    }
    private func fetchTaskModel() -> DownloadTaskModel?{
        print("fetchtaskModel")
        return filterByState(status:DownloadTaskModel.STATUS_PENDDING).first
    }
    private func update(_ model:DownloadTaskModel?){
        if model == nil {return}
        do {
            try model!.save()
        } catch {
            print(error)
        }
    }
    func cancel(id:Int)->Void{
        let model=DownloadTaskModel.findFirst(["id":id])
        if(model == nil){return}
        model?.status = NSNumber(value:DownloadTaskModel.STATUS_FAILED)
        model?.reason = "user cancel"
        en?.cancel(url:model!.fk)
        update(model)
    }
    func innerEnqueue(url:String,location:String,model:DownloadTaskModel)-> String?{
        model.status = NSNumber(value:DownloadTaskModel.STATUS_RUNNING)
        return en?.enqueue(url: url, location:location, onComplete:{error,filePath in
            if error != nil {
                model.status = NSNumber(value:DownloadTaskModel.STATUS_FAILED)
                model.reason = "\(error)"
            }else if filePath != nil {
                model.status = NSNumber(value:DownloadTaskModel.STATUS_SUCCESSFUL)
            }
            self.update(model)
        },onProgress: {current,total in
            model.totalSize = NSNumber(value:total)
            model.currentSize = NSNumber(value:current)
            self.update(model)
        })
    }
    func enqueue(url:String,location:String)->Int64{
        let model=DownloadTaskModel()
        model.uri = url
        model.location = location
        model.status = NSNumber(value:DownloadTaskModel.STATUS_PENDDING)
        do{
            let key = URL(string:url)!.absoluteString
            model.fk = key
//            innerEnqueue(url: url, location: location, model: model) ?? ""
            try model.save()
            print("save model:\(model.id!.intValue)")
            return model.id!.int64Value
        }catch {
            print(error)
            return -1
        }
    }
    
    func filterById(ids:[Int]) -> [DownloadTaskModel]{
        let results = DownloadTaskModel.findAll().filter{m in
            for (uniqueKey) in ids {
                if m.id!.intValue == uniqueKey {
                    return true
                }
            }
            return false
        }
        return results
    }
    func filterByState(status:Int) -> [DownloadTaskModel]{
        let results = DownloadTaskModel.findAll().filter{m in
            return m.status.intValue == status
        }
        return results
    }
}
