import UIKit
import WebKit

/// An isolated, non-persistent container reserved for a future private-link
/// capability. No current route instantiates it because the gate is closed.
final class PrivatePrescriptionSessionViewController: UIViewController {
    private var initialRequest: URLRequest?
    private var privateWebView: WKWebView?

    static func make(request: URLRequest) -> PrivatePrescriptionSessionViewController? {
        guard NativePrivatePrescriptionGate.isEnabled else { return nil }
        return PrivatePrescriptionSessionViewController(request: request)
    }

    private init(request: URLRequest) {
        initialRequest = request
        super.init(nibName: nil, bundle: nil)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        nil
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        guard NativePrivatePrescriptionGate.isEnabled, let request = initialRequest else {
            dismiss(animated: false)
            return
        }

        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = WKWebsiteDataStore.nonPersistent()
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = false

        let webView = WKWebView(frame: view.bounds, configuration: configuration)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(webView)
        privateWebView = webView
        webView.load(request)
    }

    override func viewDidDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)
        clearPrivateSession()
    }

    private func clearPrivateSession() {
        guard let webView = privateWebView else {
            initialRequest = nil
            return
        }
        let dataStore = webView.configuration.websiteDataStore
        webView.stopLoading()
        webView.loadHTMLString("", baseURL: nil)
        webView.removeFromSuperview()
        privateWebView = nil
        initialRequest = nil
        dataStore.removeData(
            ofTypes: WKWebsiteDataStore.allWebsiteDataTypes(),
            modifiedSince: .distantPast,
            completionHandler: {}
        )
    }
}
