package co.slidepress.app.widget

import android.content.Context
import android.util.Log
import androidx.glance.appwidget.GlanceAppWidgetManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

object WidgetUpdateHelper {
    private const val TAG = "SlidePressWidget"

    fun refreshAllWidgets(context: Context) {
        val appContext = context.applicationContext

        CoroutineScope(Dispatchers.Main).launch {
            try {
                val manager = GlanceAppWidgetManager(appContext)

                val continueIds = manager.getGlanceIds(ContinueCampaignWidget::class.java)
                val quickCreateIds = manager.getGlanceIds(QuickCreateWidget::class.java)

                Log.d(
                    TAG,
                    "Refreshing widgets: continue=${continueIds.size}, quickCreate=${quickCreateIds.size}",
                )

                continueIds.forEach { id ->
                    ContinueCampaignWidget().update(appContext, id)
                }

                quickCreateIds.forEach { id ->
                    QuickCreateWidget().update(appContext, id)
                }
            } catch (error: Exception) {
                Log.e(TAG, "Failed to refresh widgets", error)
            }
        }
    }
}
