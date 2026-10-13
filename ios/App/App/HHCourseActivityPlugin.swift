import Foundation
import ActivityKit
import Capacitor

/// Only non-clinical progress is passed to the Lock Screen.
@objc(HHCourseActivityPlugin)
public class HHCourseActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HHCourseActivityPlugin"
    public let jsName = "HHCourseActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "availability", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "list", returnType: CAPPluginReturnPromise),
    ]
    @objc func availability(_ call: CAPPluginCall) {
        if #available(iOS 16.2, *) {
            call.resolve(["available": ActivityAuthorizationInfo().areActivitiesEnabled])
        } else { call.resolve(["available": false]) }
    }
    @objc func start(_ call: CAPPluginCall) {
        guard let cycleId = call.getString("cycleId"), UUID(uuidString: cycleId) != nil,
              let day = call.getInt("day"), (1...14).contains(day),
              let locale = call.getString("locale"), ["en","ru"].contains(locale)
        else { call.reject("Invalid course"); return }
        guard #available(iOS 16.2, *), ActivityAuthorizationInfo().areActivitiesEnabled else {
            call.reject("Live Activities unavailable"); return
        }
        if let existing = Activity<HHCourseAttributes>.activities.first(where: {
            $0.attributes.cycleId == cycleId
        }) {
            watch(existing)
            call.resolve(["activityId": existing.id]); return
        }
        do {
            let state = HHCourseAttributes.ContentState(day:day,
                completedToday:call.getBool("completedToday") ?? false,finished:false)
            let activity = try Activity<HHCourseAttributes>.request(
                attributes:HHCourseAttributes(cycleId:cycleId,locale:locale),
                content:ActivityContent(state:state,staleDate:Date().addingTimeInterval(86400)),
                pushType:.token)
            watch(activity)
            call.resolve(["activityId":activity.id])
        } catch { call.reject("Could not start Live Activity") }
    }
    @objc func update(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *),
              let cycle = call.getString("cycleId"),UUID(uuidString:cycle) != nil,
              let day=call.getInt("day"),(1...14).contains(day)
        else { call.reject("Invalid course activity"); return }
        let done=call.getBool("completedToday") ?? false
        let finished=call.getBool("finished") ?? false
        Task {
            for a in Activity<HHCourseAttributes>.activities where a.attributes.cycleId == cycle {
                let content=ActivityContent(state:HHCourseAttributes.ContentState(
                    day:day,completedToday:done,finished:finished),
                    staleDate:Date().addingTimeInterval(86400))
                if finished { await a.end(content,dismissalPolicy:.immediate) }
                else { await a.update(content) }
            }
            call.resolve()
        }
    }
    @objc func stop(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {call.resolve();return}
        let cycle=call.getString("cycleId")
        Task {
            for a in Activity<HHCourseAttributes>.activities {
                if cycle == nil || a.attributes.cycleId == cycle {
                    await a.end(nil,dismissalPolicy:.immediate)
                }
            }
            call.resolve()
        }
    }
    @objc func list(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {call.resolve(["activities":[]]);return}
        let items:[[String:Any]]=Activity<HHCourseAttributes>.activities.map { a in
            watch(a)
            var result:[String:Any]=["activityId":a.id,"cycleId":a.attributes.cycleId,
                "day":a.content.state.day]
            if let token=a.pushToken { result["token"]=token.map{String(format:"%02x",$0)}.joined() }
            return result
        }
        call.resolve(["activities":items])
    }
    @available(iOS 16.2, *)
    private func watch(_ activity:Activity<HHCourseAttributes>) {
        if let token=activity.pushToken {sendToken(token,for:activity)}
        Task { @MainActor [weak self] in
            for await token in activity.pushTokenUpdates {
                self?.sendToken(token,for:activity)
            }
        }
    }
    @available(iOS 16.2, *)
    private func sendToken(_ token:Data,for activity:Activity<HHCourseAttributes>) {
        notifyListeners("token",data:["activityId":activity.id,
            "cycleId":activity.attributes.cycleId,
            "token":token.map{String(format:"%02x",$0)}.joined()])
    }
}
