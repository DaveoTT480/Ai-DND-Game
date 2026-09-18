import SwiftUI

/// The painted portrait when the server generated one, otherwise the drawn bust.
struct HeroPortraitView: View {
    @Environment(AppSettings.self) private var settings
    let gameId: String
    let hasImage: Bool
    let portrait: Portrait
    var size: CGFloat = 64
    var ring: Color = Theme.ember

    @State private var image: UIImage?

    var body: some View {
        ZStack {
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
                    .frame(width: size, height: size)
                    .clipShape(Circle())
                    .overlay(Circle().stroke(ring, lineWidth: max(1, size / 50)))
            } else {
                PortraitView(portrait: portrait, size: size, ring: ring)
            }
        }
        .frame(width: size, height: size)
        .task(id: gameId + (hasImage ? "1" : "0")) {
            guard hasImage else { image = nil; return }
            if let cached = PortraitCache.shared.image(for: gameId) { image = cached; return }
            if let data = await settings.client.portraitData(id: gameId), let ui = UIImage(data: data) {
                PortraitCache.shared.store(ui, for: gameId)
                image = ui
            }
        }
    }
}

final class PortraitCache {
    static let shared = PortraitCache()
    private let cache = NSCache<NSString, UIImage>()
    func image(for id: String) -> UIImage? { cache.object(forKey: id as NSString) }
    func store(_ image: UIImage, for id: String) { cache.setObject(image, forKey: id as NSString) }
}
