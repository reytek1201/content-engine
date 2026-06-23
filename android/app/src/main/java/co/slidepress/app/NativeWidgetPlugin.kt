package co.slidepress.app

import android.util.Log
import co.slidepress.app.widget.WidgetSnapshotStore
import co.slidepress.app.widget.WidgetUpdateHelper
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "NativeWidget")
class NativeWidgetPlugin : Plugin() {
    @PluginMethod
    fun setSnapshot(call: PluginCall) {
        val snapshot = call.getString("snapshot")

        if (snapshot.isNullOrBlank()) {
            call.reject("snapshot is required")
            return
        }

        val appContext = context.applicationContext
        WidgetSnapshotStore.saveSnapshotJson(appContext, snapshot)
        Log.d(TAG, "Saved widget snapshot (${snapshot.length} chars)")
        WidgetUpdateHelper.refreshAllWidgets(appContext)
        call.resolve()
    }

    @PluginMethod
    fun clearSnapshot(call: PluginCall) {
        val appContext = context.applicationContext
        WidgetSnapshotStore.clearSnapshot(appContext)
        Log.d(TAG, "Cleared widget snapshot")
        WidgetUpdateHelper.refreshAllWidgets(appContext)
        call.resolve()
    }

    companion object {
        private const val TAG = "SlidePressWidget"
    }
}
