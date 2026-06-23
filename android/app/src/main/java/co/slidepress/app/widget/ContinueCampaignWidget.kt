package co.slidepress.app.widget

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceModifier
import androidx.glance.LocalContext
import androidx.glance.LocalSize
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider

private val BackgroundColor = ColorProvider(Color(0xFF09090B))
private val AccentColor = ColorProvider(Color(0xFFF97316))
private val MutedColor = ColorProvider(Color(0xFFA1A1AA))
private val PrimaryTextColor = ColorProvider(Color(0xFFFAFAFA))
private val DoneColor = ColorProvider(Color(0xFF10B981))
private val InactiveDotColor = ColorProvider(Color(0x14FFFFFF))
private val ActiveDotColor = ColorProvider(Color(0x40F97316))

private val journeyLabels = listOf("Copy", "Images", "Captions", "Video", "Publish")

private fun deepLinkIntent(context: Context, deepLink: String): Intent {
    return Intent(Intent.ACTION_VIEW, Uri.parse(deepLink)).apply {
        setPackage(context.packageName)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }
}

class ContinueCampaignWidget : GlanceAppWidget() {
    override val sizeMode = SizeMode.Responsive(
        setOf(
            DpSize(110.dp, 110.dp),
            DpSize(250.dp, 110.dp),
        ),
    )

    override suspend fun provideGlance(context: Context, id: androidx.glance.GlanceId) {
        val snapshot = WidgetSnapshotReader.load(context) ?: WidgetSnapshotReader.emptyState()

        provideContent {
            val widgetContext = LocalContext.current
            val size = LocalSize.current
            val isMedium = size.width >= 250.dp

            Box(
                modifier = GlanceModifier
                    .fillMaxSize()
                    .background(BackgroundColor)
                    .clickable(actionStartActivity(deepLinkIntent(widgetContext, snapshot.deepLink)))
                    .padding(14.dp),
                contentAlignment = Alignment.TopStart,
            ) {
                Column(
                    modifier = GlanceModifier.fillMaxSize().fillMaxWidth(),
                    verticalAlignment = Alignment.Top,
                ) {
                    Text(
                        text = snapshot.title,
                        style = TextStyle(
                            color = PrimaryTextColor,
                            fontSize = if (isMedium) 17.sp else 15.sp,
                            fontWeight = FontWeight.Medium,
                        ),
                        maxLines = 2,
                    )

                    Spacer(modifier = GlanceModifier.height(8.dp))

                    Text(
                        text = snapshot.statusLine,
                        style = TextStyle(
                            color = MutedColor,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                        ),
                        maxLines = 2,
                    )

                    if (isMedium) {
                        Spacer(modifier = GlanceModifier.height(10.dp))
                        JourneyStrip(stepsComplete = snapshot.journeyStepsComplete)
                    }

                    Spacer(modifier = GlanceModifier.defaultWeight())

                    Text(
                        text = buildString {
                            append(snapshot.nextStepLabel)
                            if (!snapshot.signedOut && snapshot.campaignId != null) {
                                append(" →")
                            }
                        },
                        style = TextStyle(
                            color = AccentColor,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                        ),
                        maxLines = 1,
                    )
                }
            }
        }
    }
}

@Composable
private fun JourneyStrip(stepsComplete: Int) {
    Row(
        modifier = GlanceModifier.fillMaxWidth(),
        verticalAlignment = Alignment.Top,
    ) {
        journeyLabels.forEachIndexed { index, label ->
            Column(
                modifier = GlanceModifier.defaultWeight(),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Box(
                    modifier = GlanceModifier
                        .size(8.dp)
                        .cornerRadius(4.dp)
                        .background(
                            when {
                                index < stepsComplete -> DoneColor
                                index == stepsComplete -> ActiveDotColor
                                else -> InactiveDotColor
                            },
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    if (index < stepsComplete) {
                        Text(
                            text = "✓",
                            style = TextStyle(
                                color = DoneColor,
                                fontSize = 5.sp,
                                fontWeight = FontWeight.Bold,
                            ),
                            maxLines = 1,
                        )
                    }
                }

                Spacer(modifier = GlanceModifier.height(4.dp))

                Text(
                    text = label,
                    style = TextStyle(
                        color = if (index == stepsComplete) PrimaryTextColor else MutedColor,
                        fontSize = 8.sp,
                        fontWeight = FontWeight.Medium,
                    ),
                    maxLines = 1,
                )
            }

            if (index < journeyLabels.lastIndex) {
                Spacer(modifier = GlanceModifier.width(6.dp))
            }
        }
    }
}

class ContinueCampaignWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = ContinueCampaignWidget()
}
