import ActivityKit
import Foundation

@available(iOS 16.2, *)
struct HHCourseAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var day: Int
        var completedToday: Bool
        var finished: Bool
    }
    let cycleId: String
    let locale: String
}
