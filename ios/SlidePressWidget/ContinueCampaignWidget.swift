import SwiftUI
import WidgetKit

private enum WidgetPalette {
    static let background = Color(red: 9 / 255, green: 9 / 255, blue: 11 / 255)
    static let accent = Color(red: 249 / 255, green: 115 / 255, blue: 22 / 255)
    static let muted = Color(red: 161 / 255, green: 161 / 255, blue: 170 / 255)
    static let primaryText = Color(red: 250 / 255, green: 250 / 255, blue: 250 / 255)
    static let done = Color(red: 16 / 255, green: 185 / 255, blue: 129 / 255)
}

private let journeyLabels = ["Copy", "Images", "Captions", "Video", "Publish"]

struct ContinueCampaignEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshotData
}

struct ContinueCampaignProvider: TimelineProvider {
    func placeholder(in context: Context) -> ContinueCampaignEntry {
        ContinueCampaignEntry(date: Date(), snapshot: WidgetSnapshotReader.placeholder())
    }

    func getSnapshot(in context: Context, completion: @escaping (ContinueCampaignEntry) -> Void) {
        let snapshot = WidgetSnapshotReader.load() ?? WidgetSnapshotReader.emptyState()
        completion(ContinueCampaignEntry(date: Date(), snapshot: snapshot))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ContinueCampaignEntry>) -> Void) {
        let snapshot = WidgetSnapshotReader.load() ?? WidgetSnapshotReader.emptyState()
        let entry = ContinueCampaignEntry(date: Date(), snapshot: snapshot)
        let refresh = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date().addingTimeInterval(900)
        completion(Timeline(entries: [entry], policy: .after(refresh)))
    }
}

struct ContinueCampaignWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: ContinueCampaignEntry

    var body: some View {
        ZStack {
            WidgetPalette.background

            VStack(alignment: .leading, spacing: family == .systemSmall ? 8 : 10) {
                HStack(alignment: .top) {
                    Text(entry.snapshot.title)
                        .font(.system(size: family == .systemSmall ? 15 : 17, weight: .semibold))
                        .foregroundColor(WidgetPalette.primaryText)
                        .lineLimit(2)

                    Spacer(minLength: 4)

                    if entry.snapshot.isGenerating {
                        ProgressView()
                            .tint(WidgetPalette.accent)
                            .scaleEffect(0.8)
                    }
                }

                Text(entry.snapshot.statusLine)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(WidgetPalette.muted)
                    .lineLimit(2)

                if family == .systemMedium {
                    JourneyStripView(stepsComplete: entry.snapshot.journeyStepsComplete)
                }

                Spacer(minLength: 0)

                HStack(spacing: 4) {
                    Text(entry.snapshot.nextStepLabel)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(WidgetPalette.accent)
                        .lineLimit(1)

                    if !entry.snapshot.signedOut && entry.snapshot.campaignId != nil {
                        Image(systemName: "arrow.right")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(WidgetPalette.accent)
                    }
                }
            }
            .padding(14)
        }
        .widgetURL(URL(string: entry.snapshot.deepLink))
    }
}

struct JourneyStripView: View {
    let stepsComplete: Int

    private func dotColor(for index: Int) -> Color {
        if index < stepsComplete {
            return WidgetPalette.done
        }

        if index == stepsComplete {
            return WidgetPalette.accent.opacity(0.25)
        }

        return Color.white.opacity(0.08)
    }

    var body: some View {
        HStack(spacing: 6) {
            ForEach(Array(journeyLabels.enumerated()), id: \.offset) { index, label in
                VStack(spacing: 4) {
                    ZStack {
                        Circle()
                            .fill(dotColor(for: index))
                            .frame(width: 8, height: 8)

                        if index < stepsComplete {
                            Image(systemName: "checkmark")
                                .font(.system(size: 5, weight: .bold))
                                .foregroundColor(WidgetPalette.done)
                        }
                    }

                    Text(label)
                        .font(.system(size: 8, weight: .semibold))
                        .foregroundColor(
                            index == stepsComplete
                                ? WidgetPalette.primaryText
                                : WidgetPalette.muted
                        )
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding(.top, 2)
    }
}

struct ContinueCampaignWidget: Widget {
    let kind = "ContinueCampaignWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ContinueCampaignProvider()) { entry in
            if #available(iOS 17.0, *) {
                ContinueCampaignWidgetView(entry: entry)
                    .containerBackground(for: .widget) {
                        WidgetPalette.background
                    }
            } else {
                ContinueCampaignWidgetView(entry: entry)
            }
        }
        .configurationDisplayName("Continue Campaign")
        .description("See your active campaign and jump back in.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct QuickCreateWidgetView: View {
    var body: some View {
        ZStack {
            WidgetPalette.background

            VStack(alignment: .leading, spacing: 10) {
                Image(systemName: "plus.circle.fill")
                    .font(.system(size: 28, weight: .semibold))
                    .foregroundColor(WidgetPalette.accent)

                Text("New campaign")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(WidgetPalette.primaryText)

                Text("Turn a topic into slides")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(WidgetPalette.muted)
                    .lineLimit(2)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .padding(14)
        }
        .widgetURL(URL(string: "co.slidepress.app://new"))
    }
}

struct QuickCreateWidget: Widget {
    let kind = "QuickCreateWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ContinueCampaignProvider()) { _ in
            if #available(iOS 17.0, *) {
                QuickCreateWidgetView()
                    .containerBackground(for: .widget) {
                        WidgetPalette.background
                    }
            } else {
                QuickCreateWidgetView()
            }
        }
        .configurationDisplayName("New Campaign")
        .description("Start a new SlidePress campaign.")
        .supportedFamilies([.systemSmall])
    }
}
