package co.slidepress.app.widget

import android.content.Context

object WidgetSnapshotReader {
    fun load(context: Context): WidgetSnapshotData? {
        val json = WidgetSnapshotStore.loadSnapshotJson(context) ?: return null
        return WidgetSnapshotData.fromJson(json)
    }

    fun placeholder(): WidgetSnapshotData {
        return WidgetSnapshotData(
            schemaVersion = 1,
            updatedAt = "",
            signedOut = false,
            campaignId = null,
            title = "Summer Sale carousel",
            statusLine = "3/5 images",
            nextStepLabel = "Generate captions",
            journeyStep = "images",
            journeyStepsComplete = 2,
            isGenerating = false,
            deepLink = WidgetConstants.DEEP_LINK_NEW,
        )
    }

    fun emptyState(): WidgetSnapshotData {
        return WidgetSnapshotData(
            schemaVersion = 1,
            updatedAt = "",
            signedOut = false,
            campaignId = null,
            title = "SlidePress",
            statusLine = "No active campaigns",
            nextStepLabel = "Create campaign",
            journeyStep = "copy",
            journeyStepsComplete = 0,
            isGenerating = false,
            deepLink = WidgetConstants.DEEP_LINK_NEW,
        )
    }
}
