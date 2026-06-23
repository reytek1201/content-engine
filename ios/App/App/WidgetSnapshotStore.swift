import Foundation

enum WidgetConstants {
    static let appGroupId = "group.co.slidepress.app"
    static let snapshotKey = "widgetSnapshot"
}

enum WidgetSnapshotStore {
    static var defaults: UserDefaults? {
        UserDefaults(suiteName: WidgetConstants.appGroupId)
    }

    static func saveSnapshotJson(_ json: String) {
        defaults?.set(json, forKey: WidgetConstants.snapshotKey)
    }

    static func loadSnapshotJson() -> String? {
        defaults?.string(forKey: WidgetConstants.snapshotKey)
    }

    static func clearSnapshot() {
        defaults?.removeObject(forKey: WidgetConstants.snapshotKey)
    }
}
