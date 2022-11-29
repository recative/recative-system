//
//  Render.swift
//  Plugin
//
//  Created by Sun on 2022/8/1.
//  Copyright © 2022 Max Lynch. All rights reserved.
//

import Foundation
import SwiftState

protocol Render{
    func image2Video(task:TaskModel)
    func concat(task:TaskModel)
}


enum MachineState :StateType{
    case NoWork,FetchTask,Rendering,Complete,Error
}

class SingleTaskImpl:Render{
   
    func image2Video(task: TaskModel) {
        
    }
    
    func concat(task: TaskModel) {
        
    }
    
    var taskModel:TaskModel?=nil
    let machine = StateMachine<MachineState,NoEvent>(state:MachineState.NoWork) { _machine in
        _machine.addRoute(MachineState.NoWork => MachineState.FetchTask)
        _machine.addRoute(MachineState.Error => MachineState.FetchTask)
        _machine.addRoute(MachineState.Complete => MachineState.FetchTask)
        
        _machine.addRoute(MachineState.FetchTask => MachineState.NoWork)
        _machine.addRoute(MachineState.FetchTask => MachineState.Rendering)
        _machine.addRoute(MachineState.Rendering => MachineState.Complete)
        _machine.addRoute(MachineState.Rendering => MachineState.Error)
    }
    init(){
        machine.addHandler( .any => MachineState.FetchTask) { context in
            
        }
        machine.addHandler(MachineState.FetchTask => MachineState.Rendering){ context in
            self.taskModel?.status = 1
        }
        machine.addHandler(MachineState.FetchTask => MachineState.Error){ context in
            self.taskModel?.status = -1
        }
        machine.addHandler(MachineState.Rendering => MachineState.Complete){ context in
            self.taskModel?.status = 0
        }
        machine.addHandler(MachineState.Complete => MachineState.NoWork){ context in
            self.taskModel = nil
        }
        machine.addHandler(MachineState.Rendering => MachineState.Error){context in
            self.machine.tryState(MachineState.NoWork, userInfo:nil)
        }
        machine.addHandler(MachineState.Error => MachineState.NoWork){ context in
            self.taskModel = nil
        }
    }
}
