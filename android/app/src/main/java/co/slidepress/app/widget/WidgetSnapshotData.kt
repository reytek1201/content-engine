package co.slidepress.app.widget

import org.json.JSONObject

data class WidgetSnapshotData(
    val schemaVersion: Int,
    val updatedAt: String,
    val signedOut: Boolean,
    val campaignId: String?,
    val title: String,
    val statusLine: String,
    val nextStepLabel: String,
    val journeyStep: String,
    val journeyStepsComplete: Int,
    val isGenerating: Boolean,
    val deepLink: String,
) {
    companion object {
        fun fromJson(json: String): WidgetSnapshotData? {
            return try {
                val obj = JSONObject(json)
                val campaignIdValue = when {
                    obj.isNull("campaignId") -> null
                    else -> obj.optString("campaignId").ifBlank { null }
                }
                WidgetSnapshotData(
                    schemaVersion = obj.getInt("schemaVersion"),
                    updatedAt = obj.optString("updatedAt", ""),
                    signedOut = obj.optBoolean("signedOut", false),
                    campaignId = campaignIdValue,
                    title = obj.optString("title", "SlidePress"),
                    statusLine = obj.optString("statusLine", ""),
                    nextStepLabel = obj.optString("nextStepLabel", ""),
                    journeyStep = obj.optString("journeyStep", "copy"),
                    journeyStepsComplete = obj.optInt("journeyStepsComplete", 0),
                    isGenerating = obj.optBoolean("isGenerating", false),
                    deepLink = obj.optString("deepLink", WidgetConstants.DEEP_LINK_NEW),
                )
            } catch (_: Exception) {
                null
            }
        }
    }
}
