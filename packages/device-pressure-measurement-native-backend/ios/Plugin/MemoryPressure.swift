import Foundation

@objc public class MemoryPressure: NSObject {
    public func memoryInfoResult() -> [String:Any]{
        let (usage,available,total) = memoryInfo()
        return ["platform":"iOS",
                "usage":usage,
                "total":total,
                "available":available
        ]
    }
    private func memoryInfo() -> (UInt64,UInt64,UInt64){
        var taskInfo = task_vm_info_data_t()
        var availableMemory :UInt64 = 0
        var count = mach_msg_type_number_t(MemoryLayout<task_vm_info>.size) / 4
        let result: kern_return_t = withUnsafeMutablePointer(to: &taskInfo) {
            $0.withMemoryRebound(to: integer_t.self, capacity: 1) {
               task_info(mach_task_self_, task_flavor_t(TASK_VM_INFO), $0, &count)
            }
        }

        var used: UInt64 = 0
        if result == KERN_SUCCESS {
            used = UInt64(taskInfo.phys_footprint)
        }
//        availableMemory = (UInt64)(taskInfo.page_size * 16)
        let total = ProcessInfo.processInfo.physicalMemory
//        let total = UInt64(0)
        return (used,availableMemory,total)
    }
}
