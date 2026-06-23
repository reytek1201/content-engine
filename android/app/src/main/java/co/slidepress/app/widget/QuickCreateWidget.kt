package co.slidepress.app.widget

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceModifier
import androidx.glance.LocalContext
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider

private val BackgroundColor = ColorProvider(Color(0xFF09090B))
private val AccentColor = ColorProvider(Color(0xFFF97316))
private val MutedColor = ColorProvider(Color(0xFFA1A1AA))
private val PrimaryTextColor = ColorProvider(Color(0xFFFAFAFA))

class QuickCreateWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: androidx.glance.GlanceId) {
        provideContent {
            val widgetContext = LocalContext.current
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(WidgetConstants.DEEP_LINK_NEW)).apply {
                setPackage(widgetContext.packageName)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            }

            Box(
                modifier = GlanceModifier
                    .fillMaxSize()
                    .background(BackgroundColor)
                    .clickable(actionStartActivity(intent))
                    .padding(14.dp),
                contentAlignment = Alignment.TopStart,
            ) {
                Column(
                    modifier = GlanceModifier.fillMaxWidth(),
                    verticalAlignment = Alignment.Top,
                ) {
                    Text(
                        text = "+",
                        style = TextStyle(
                            color = AccentColor,
                            fontSize = 28.sp,
                            fontWeight = FontWeight.Bold,
                        ),
                    )

                    Spacer(modifier = GlanceModifier.height(10.dp))

                    Text(
                        text = "New campaign",
                        style = TextStyle(
                            color = PrimaryTextColor,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Medium,
                        ),
                    )

                    Spacer(modifier = GlanceModifier.height(4.dp))

                    Text(
                        text = "Turn a topic into slides",
                        style = TextStyle(
                            color = MutedColor,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                        ),
                        maxLines = 2,
                    )
                }
            }
        }
    }
}

class QuickCreateWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = QuickCreateWidget()
}
