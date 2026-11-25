import ActivityKit
import SwiftUI
import WidgetKit

@available(iOS 16.2, *)
struct HHCourseLiveWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: HHCourseAttributes.self) { context in
            Link(destination: URL(string: "https://holistichouse.vercel.app/" +
                (context.attributes.locale == "ru" ? "ru" : "en") + "/app/course")!) {
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text("✦ HOLISTIC HOUSE")
                            .font(.caption.weight(.heavy))
                            .foregroundStyle(Color.mint)
                        Spacer()
                        Text(context.attributes.locale == "ru" ? "МОЙ КУРС" : "MY COURSE")
                            .font(.caption2.weight(.bold))
                            .foregroundStyle(.white.opacity(0.8))
                    }
                    HStack {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(context.attributes.locale == "ru" ?
                                 "День \(context.state.day) из 14" :
                                 "Day \(context.state.day) of 14")
                                .font(.system(size: 26, weight: .bold, design: .rounded))
                                .foregroundStyle(.white)
                            Text(context.state.completedToday
                                ? (context.attributes.locale == "ru" ? "Сегодня выполнено ✓" : "Today's lesson complete ✓")
                                : (context.attributes.locale == "ru" ? "Ваш маленький шаг сегодня" : "Your small step today"))
                                .font(.subheadline)
                                .foregroundStyle(.white.opacity(0.88))
                        }
                        Spacer()
                        Text(context.state.completedToday ? "✓" : "✦")
                            .font(.system(size: 36, weight: .bold))
                            .foregroundStyle(Color(red: 0.13, green: 0.36, blue: 0.29))
                            .frame(width: 68, height: 68)
                            .background(Color.mint, in: RoundedRectangle(cornerRadius: 19))
                    }
                    ProgressView(value: Double(max(0, min(14, context.state.day - (context.state.completedToday ? 0 : 1)))), total: 14)
                        .tint(.mint)
                    HStack {
                        Text(context.attributes.locale == "ru" ? "5–12 минут · ваш ритм" : "5–12 min · your pace")
                        Spacer()
                        Text(context.attributes.locale == "ru" ? "Открыть →" : "Open →")
                            .bold()
                    }
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.9))
                }
                .padding(17)
                .background(
                    LinearGradient(colors: [
                        Color(red: 0.07, green: 0.17, blue: 0.20),
                        Color(red: 0.14, green: 0.34, blue: 0.30)
                    ], startPoint: .topLeading, endPoint: .bottomTrailing)
                )
            }
            .activityBackgroundTint(Color(red: 0.07, green: 0.17, blue: 0.20))
            .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text("✦ HOLISTIC HOUSE").font(.caption2.bold()).foregroundStyle(.mint)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("\(context.state.day)/14").bold()
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.state.completedToday ? "✓" :
                        (context.attributes.locale == "ru" ? "Продолжить курс" : "Continue course"))
                }
            } compactLeading: {
                Text("✦").foregroundStyle(.mint)
            } compactTrailing: {
                Text("\(context.state.day)/14").font(.caption2.bold())
            } minimal: {
                Text("✦").foregroundStyle(.mint)
            }
            .widgetURL(URL(string: "https://holistichouse.vercel.app/" +
                (context.attributes.locale == "ru" ? "ru" : "en") + "/app/course"))
        }
    }
}

@main
struct HHCourseWidgets: WidgetBundle {
    var body: some Widget {
        if #available(iOS 16.2, *) { HHCourseLiveWidget() }
    }
}
