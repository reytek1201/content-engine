import Capacitor
import WidgetKit

@objc(NativeWidgetPlugin)
public class NativeWidgetPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeWidgetPlugin"
    public let jsName = "NativeWidget"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setSnapshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearSnapshot", returnType: CAPPluginReturnPromise),
    ]

    @objc func setSnapshot(_ call: CAPPluginCall) {
        guard let snapshot = call.getString("snapshot") else {
            call.reject("snapshot is required")
            return
        }

        WidgetSnapshotStore.saveSnapshotJson(snapshot)

        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }

        call.resolve()
    }

    @objc func clearSnapshot(_ call: CAPPluginCall) {
        WidgetSnapshotStore.clearSnapshot()

        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }

        call.resolve()
    }
}
