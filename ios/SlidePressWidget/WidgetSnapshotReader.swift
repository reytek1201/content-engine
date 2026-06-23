import Foundation

enum WidgetConstants {
    static let appGroupId = "group.co.slidepress.app"
    static let snapshotKey = "widgetSnapshot"
}

struct WidgetSnapshotData: Codable {
    let schemaVersion: Int
    let updatedAt: String
    let signedOut: Bool
    let campaignId: String?
    let title: String
    let statusLine: String
    let nextStepLabel: String
    let journeyStep: String
    let journeyStepsComplete: Int
    let isGenerating: Bool
    let deepLink: String
}

enum WidgetSnapshotReader {
    static func load() -> WidgetSnapshotData? {
        guard
            let defaults = UserDefaults(suiteName: WidgetConstants.appGroupId),
            let json = defaults.string(forKey: WidgetConstants.snapshotKey),
            let data = json.data(using: .utf8)
        else {
            return nil
        }

        return try? JSONDecoder().decode(WidgetSnapshotData.self, from: data)
    }

    static func placeholder() -> WidgetSnapshotData {
        WidgetSnapshotData(
            schemaVersion: 1,
            updatedAt: "",
            signedOut: false,
            campaignId: nil,
            title: "Summer Sale carousel",
            statusLine: "3/5 images",
            nextStepLabel: "Generate captions",
            journeyStep: "images",
            journeyStepsComplete: 2,
            isGenerating: false,
            deepLink: "co.slidepress.app://new"
        )
    }

    static func emptyState() -> WidgetSnapshotData {
        WidgetSnapshotData(
            schemaVersion: 1,
            updatedAt: "",
            signedOut: false,
            campaignId: nil,
            title: "SlidePress",
            statusLine: "No active campaigns",
            nextStepLabel: "Create campaign",
            journeyStep: "copy",
            journeyStepsComplete: 0,
            isGenerating: false,
            deepLink: "co.slidepress.app://new"
        )
    }
}
