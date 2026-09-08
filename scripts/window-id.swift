// 找一个窗口的 CGWindowID。按矩形截屏在这台机器上会把前面压着的窗口
// 一起拍进去 —— screencapture -l<id> 只拍指定窗口，前面压什么都不影响。
import CoreGraphics
import Foundation

let needle = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "OpenExam"
guard let list = CGWindowListCopyWindowInfo([.optionAll, .excludeDesktopElements], kCGNullWindowID)
        as? [[String: Any]] else { exit(1) }
for w in list {
    let name = (w[kCGWindowName as String] as? String) ?? ""
    let owner = (w[kCGWindowOwnerName as String] as? String) ?? ""
    guard let num = w[kCGWindowNumber as String] as? Int else { continue }
    let bounds = w[kCGWindowBounds as String] as? [String: Any]
    let h = (bounds?["Height"] as? Double) ?? 0
    if (name.contains(needle) || owner.contains(needle)) && h > 200 {
        print("\(num)\t\(owner)\t\(name)")
    }
}
