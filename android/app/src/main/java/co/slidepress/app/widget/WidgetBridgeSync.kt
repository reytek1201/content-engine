package co.slidepress.app.widget

import android.util.Log
import com.getcapacitor.Bridge

object WidgetBridgeSync {
    private const val TAG = "SlidePressWidget"

    private const val SYNC_JS = """
        (async () => {
          try {
            const response = await fetch('/api/widget/snapshot', { credentials: 'include' });
            if (response.status === 401) {
              await Capacitor.nativePromise(
                'NativeWidget',
                'clearSnapshot',
                {}
              );
              return;
            }
            if (!response.ok) {
              return;
            }
            const snapshot = await response.json();
            await Capacitor.nativePromise(
              'NativeWidget',
              'setSnapshot',
              { snapshot: JSON.stringify(snapshot) }
            );
          } catch (error) {
            console.warn('[SlidePressWidget] native resume sync failed', error);
          }
        })();
    """

    fun requestSnapshotFromWeb(bridge: Bridge) {
        try {
            bridge.eval(SYNC_JS.trimIndent(), null)
        } catch (error: Exception) {
            Log.w(TAG, "Could not schedule widget sync from web", error)
        }
    }
}
