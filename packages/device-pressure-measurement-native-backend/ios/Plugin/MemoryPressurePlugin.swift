import Foundation
import Capacitor

/**
 * Please read the Capacitor iOS Plugin Development Guide
 * here: https://capacitorjs.com/docs/plugins/ios
 */
@objc(MemoryPressurePlugin)
public class MemoryPressurePlugin: CAPPlugin {
    private let implementation = MemoryPressure()
    public override func load() {
        super.load()
        NotificationCenter.default.addObserver(self, selector: #selector(self.methodOfReceivedNotification(notification:)), name: UIApplication.didReceiveMemoryWarningNotification, object: nil)
    }
    @objc public func memoryInfo(_ call: CAPPluginCall){
        call.resolve(implementation.memoryInfoResult())
    }
    @objc private func methodOfReceivedNotification(notification:Notification){
        if self.hasListeners("lowMemoryWarning") {
            self.notifyListeners("lowMemoryWarning", data: implementation.memoryInfoResult())
        }
    }
}
