package co.slidepress.app.widget

import android.content.Context

object WidgetSnapshotStore {
    fun saveSnapshotJson(context: Context, json: String) {
        context
            .getSharedPreferences(WidgetConstants.PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(WidgetConstants.SNAPSHOT_KEY, json)
            .commit()
    }

    fun loadSnapshotJson(context: Context): String? {
        return context
            .getSharedPreferences(WidgetConstants.PREFS_NAME, Context.MODE_PRIVATE)
            .getString(WidgetConstants.SNAPSHOT_KEY, null)
    }

    fun clearSnapshot(context: Context) {
        context
            .getSharedPreferences(WidgetConstants.PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .remove(WidgetConstants.SNAPSHOT_KEY)
            .commit()
    }
}
