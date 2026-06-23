import Foundation
import WidgetKit

enum WidgetPushHandler {
    static func applySnapshotIfPresent(userInfo: [AnyHashable: Any]) {
        guard
            let snapshotJson = userInfo["widgetSnapshot"] as? String,
            !snapshotJson.isEmpty
        else {
            return
        }

        WidgetSnapshotStore.saveSnapshotJson(snapshotJson)

        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
    }
}
