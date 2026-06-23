package co.slidepress.app

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import co.slidepress.app.widget.WidgetBridgeSync
import co.slidepress.app.widget.WidgetUpdateHelper
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    private val widgetSyncHandler = Handler(Looper.getMainLooper())
    private val widgetSyncRunnable = Runnable {
        val bridge = bridge
        if (bridge != null) {
            WidgetBridgeSync.requestSnapshotFromWeb(bridge)
        }
        WidgetUpdateHelper.refreshAllWidgets(this)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(NativeWidgetPlugin::class.java)
        super.onCreate(savedInstanceState)
    }

    override fun onResume() {
        super.onResume()
        scheduleWidgetSync()
    }

    override fun onDestroy() {
        widgetSyncHandler.removeCallbacks(widgetSyncRunnable)
        super.onDestroy()
    }

    private fun scheduleWidgetSync() {
        widgetSyncHandler.removeCallbacks(widgetSyncRunnable)
        widgetSyncHandler.postDelayed(widgetSyncRunnable, WIDGET_SYNC_DELAY_MS)
    }

    companion object {
        private const val WIDGET_SYNC_DELAY_MS = 800L
    }
}
