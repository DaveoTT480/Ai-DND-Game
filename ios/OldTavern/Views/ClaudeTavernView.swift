import SwiftUI
import WebKit

/// Plays the tavern through the claude.ai Artifact, on the player's own Claude
/// subscription. No server and no API key: the page inside the web view talks
/// to Claude itself. The login is kept in the app's own cookie store.
struct ClaudeTavernView: View {
    @Environment(AppSettings.self) private var settings
    @State private var controller = TavernWebController()
    @State private var showSettings = false

    var body: some View {
        ZStack(alignment: .top) {
            Color.black.ignoresSafeArea()
            TavernWebView(controller: controller, url: settings.artifactURL)
                .ignoresSafeArea(.container, edges: .bottom)
            if controller.isLoading {
                ProgressView()
                    .tint(Theme.ember)
                    .padding(.top, 8)
            }
            if let message = controller.errorMessage {
                VStack(spacing: 10) {
                    Text("The tavern door is stuck")
                        .font(Theme.display(22))
                        .foregroundStyle(Theme.parchment)
                    Text(message)
                        .font(Theme.small)
                        .foregroundStyle(Theme.muted)
                        .multilineTextAlignment(.center)
                    Button("Try again") { controller.reload() }
                        .buttonStyle(EmberButtonStyle())
                    Button("Open in Safari instead") { controller.openInSafari() }
                        .font(Theme.small)
                        .foregroundStyle(Theme.ember)
                }
                .padding(20)
                .tavernCard()
                .padding(20)
                .padding(.top, 40)
            }
        }
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button {
                    controller.goHome()
                } label: {
                    Image(systemName: "house")
                }
                .accessibilityLabel("Back to the tavern")
            }
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button { controller.reload() } label: { Label("Reload", systemImage: "arrow.clockwise") }
                    Button { controller.openInSafari() } label: { Label("Open in Safari", systemImage: "safari") }
                    Button { showSettings = true } label: { Label("Settings", systemImage: "gearshape") }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .toolbarBackground(.visible, for: .navigationBar)
        .toolbarBackground(Color.black, for: .navigationBar)
        .sheet(isPresented: $showSettings, onDismiss: {
            if controller.currentURL?.absoluteString != settings.artifactURL.trimmingCharacters(in: .whitespacesAndNewlines) {
                controller.load(settings.artifactURL)
            }
        }) {
            SettingsView()
        }
    }
}

/// Owns the WKWebView so SwiftUI can drive reloads and navigation.
@MainActor
@Observable
final class TavernWebController: NSObject, WKNavigationDelegate, WKUIDelegate {
    var isLoading = false
    var errorMessage: String?
    private(set) var currentURL: URL?

    let webView: WKWebView

    override init() {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.allowsInlineMediaPlayback = true
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        webView = WKWebView(frame: .zero, configuration: config)
        // Present as mobile Safari: the artifact viewer expects a real browser, and some
        // sign-in pages refuse the default embedded user agent.
        webView.customUserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        webView.allowsBackForwardNavigationGestures = true
        webView.isOpaque = false
        webView.backgroundColor = .black
        webView.scrollView.backgroundColor = .black
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        super.init()
        webView.navigationDelegate = self
        webView.uiDelegate = self
    }

    func load(_ urlString: String) {
        guard let url = URL(string: urlString.trimmingCharacters(in: .whitespacesAndNewlines)), url.scheme?.hasPrefix("http") == true else {
            errorMessage = "The artifact address in Settings is not a valid link."
            return
        }
        errorMessage = nil
        currentURL = url
        webView.load(URLRequest(url: url))
    }

    func reload() {
        errorMessage = nil
        if webView.url == nil, let currentURL { webView.load(URLRequest(url: currentURL)) } else { webView.reload() }
    }

    /// The tavern's own home screen lives at the page's #home route.
    func goHome() {
        guard let currentURL else { return }
        var comps = URLComponents(url: currentURL, resolvingAgainstBaseURL: false)
        comps?.fragment = "home"
        if let url = comps?.url { webView.load(URLRequest(url: url)) }
    }

    func openInSafari() {
        guard let url = webView.url ?? currentURL else { return }
        UIApplication.shared.open(url)
    }

    // MARK: WKNavigationDelegate

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        isLoading = true
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        isLoading = false
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        isLoading = false
        if (error as NSError).code != NSURLErrorCancelled { errorMessage = error.localizedDescription }
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        isLoading = false
        if (error as NSError).code != NSURLErrorCancelled { errorMessage = error.localizedDescription }
    }

    // MARK: WKUIDelegate

    /// Links that ask for a new window (target=_blank) open in the same view.
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if navigationAction.targetFrame == nil, let url = navigationAction.request.url {
            webView.load(URLRequest(url: url))
        }
        return nil
    }
}

struct TavernWebView: UIViewRepresentable {
    let controller: TavernWebController
    let url: String

    func makeUIView(context: Context) -> WKWebView {
        // Kick off the first load after this update pass; loading mutates observed state.
        let controller = controller, url = url
        Task { @MainActor in controller.load(url) }
        return controller.webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
