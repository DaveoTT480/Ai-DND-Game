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
            if let popup = controller.popup {
                VStack(spacing: 0) {
                    HStack {
                        Text("Sign in")
                            .font(Theme.small)
                            .foregroundStyle(Theme.muted)
                        Spacer()
                        Button("Close") { controller.closePopup() }
                            .font(Theme.small)
                            .foregroundStyle(Theme.ember)
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(Color.black)
                    PopupWebView(webView: popup)
                }
                .background(Color.black)
                .ignoresSafeArea(.container, edges: .bottom)
                .transition(.move(edge: .bottom))
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
                    Button { controller.goHome() } label: { Label("Back to the tavern", systemImage: "house") }
                    Button { Task { await controller.describePage() } } label: { Label("Page details", systemImage: "info.circle") }
                    Button(role: .destructive) { controller.signOut() } label: { Label("Sign out and reset", systemImage: "arrow.uturn.backward") }
                    Button { showSettings = true } label: { Label("Settings", systemImage: "gearshape") }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .toolbarBackground(.visible, for: .navigationBar)
        .toolbarBackground(Color.black, for: .navigationBar)
        .alert("Page details", isPresented: Binding(get: { controller.pageDetails != nil }, set: { if !$0 { controller.pageDetails = nil } })) {
            Button("Copy") { UIPasteboard.general.string = controller.pageDetails ?? ""; controller.pageDetails = nil }
            Button("OK", role: .cancel) { controller.pageDetails = nil }
        } message: {
            Text(controller.pageDetails ?? "")
        }
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
    var pageDetails: String?
    /// A window the page opened (Google sign-in uses one); shown over the tavern until it closes itself.
    var popup: WKWebView?
    private(set) var currentURL: URL?
    private var returnTask: Task<Void, Never>?

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
        errorMessage = nil
        if let url = comps?.url { webView.load(URLRequest(url: url)) }
    }

    /// Sign-in flows land on claude.ai's own home rather than back on the tavern.
    /// When the web view settles on such a page, steer it back to the artifact.
    private func steerBackIfLost() {
        returnTask?.cancel()
        guard let url = webView.url, let target = currentURL else { return }
        let host = url.host ?? ""
        guard host.hasSuffix("claude.ai") else { return }
        let path = url.path
        if path.contains("/artifact") { return }
        let lostPaths: Set<String> = ["", "/", "/new", "/chats", "/recents", "/code", "/projects", "/artifacts", "/chat"]
        let isLost = lostPaths.contains(path) || path.hasPrefix("/chat/") || path.hasPrefix("/project/")
        guard isLost else { return }
        returnTask = Task { @MainActor [weak self] in
            try? await Task.sleep(for: .seconds(1.5))
            guard let self, !Task.isCancelled, let now = self.webView.url, now == url else { return }
            self.webView.load(URLRequest(url: target))
        }
    }

    /// What the web view is actually showing, for bug reports.
    func describePage() async {
        var lines = ["URL: \(webView.url?.absoluteString ?? "none")", "Title: \(webView.title ?? "")", "Loading: \(webView.isLoading)"]
        let js = "(() => { try { const b = document.body; return [document.readyState, b ? b.innerText.replace(/\\s+/g, ' ').slice(0, 240) : 'no body', document.querySelectorAll('iframe').length + ' iframes', getComputedStyle(document.documentElement).backgroundColor].join(' | '); } catch (e) { return 'error ' + e.message; } })()"
        let result: Any? = try? await webView.evaluateJavaScript(js)
        if let text = result as? String { lines.append("Page: \(text)") }
        pageDetails = lines.joined(separator: "\n")
    }

    /// Clears cookies and site data so the next visit signs in fresh.
    func signOut() {
        let store = webView.configuration.websiteDataStore
        let types = WKWebsiteDataStore.allWebsiteDataTypes()
        store.fetchDataRecords(ofTypes: types) { records in
            store.removeData(ofTypes: types, for: records) { [weak self] in
                Task { @MainActor in self?.reload() }
            }
        }
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
        if webView === self.webView { steerBackIfLost() }
    }

    func closePopup() {
        popup?.stopLoading()
        popup = nil
    }

    /// The web content process died (memory pressure, a crash): reload rather than sit on a blank view.
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        isLoading = false
        if let currentURL { webView.load(URLRequest(url: currentURL)) }
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

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        pageDetails = message
        completionHandler()
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        completionHandler(true)
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        completionHandler(defaultText)
    }

    /// The page asked for a new window. Sign-in popups talk back to their opener, so the
    /// child must be a real web view made from the offered configuration, not a reload here.
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        let child = WKWebView(frame: webView.bounds, configuration: configuration)
        child.customUserAgent = webView.customUserAgent
        child.navigationDelegate = self
        child.uiDelegate = self
        child.isOpaque = false
        child.backgroundColor = .black
        child.scrollView.backgroundColor = .black
        popup = child
        return child
    }

    /// The popup called window.close(): sign-in is done, drop it.
    func webViewDidClose(_ webView: WKWebView) {
        if webView === popup { popup = nil }
    }
}

struct PopupWebView: UIViewRepresentable {
    let webView: WKWebView
    func makeUIView(context: Context) -> WKWebView { webView }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
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
