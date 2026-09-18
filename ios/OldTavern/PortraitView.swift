import SwiftUI

/// A flat tavern-sign portrait drawn from the Keeper's fixed choices.
/// Mirrors portraitSVG in artifact/old-tavern.html on a 100x100 canvas.
struct PortraitView: View {
    let portrait: Portrait
    var size: CGFloat = 64
    var ring: Color = Theme.ember

    private static let skin: [String: Color] = ["light": Color(hex: 0xF1D3B3), "fair": Color(hex: 0xE8C39E), "tan": Color(hex: 0xD2A679), "olive": Color(hex: 0xC19A6B), "brown": Color(hex: 0x8D5A3B), "dark": Color(hex: 0x5A3825)]
    private static let hair: [String: Color] = ["black": Color(hex: 0x1B1B1B), "brown": Color(hex: 0x5A3A1E), "blond": Color(hex: 0xD9B45E), "red": Color(hex: 0xB4452A), "grey": Color(hex: 0x9A9A9A), "white": Color(hex: 0xE8E8E8)]
    private static let eyes: [String: Color] = ["brown": Color(hex: 0x4A2E1A), "blue": Color(hex: 0x3F7FBF), "green": Color(hex: 0x4F8A4A), "grey": Color(hex: 0x8A8F96), "hazel": Color(hex: 0x7A6A3A), "dark": Color(hex: 0x1B1B1B)]
    private static let clothing: [String: Color] = ["crimson": Color(hex: 0x8C2A2A), "forest": Color(hex: 0x2F5D3A), "navy": Color(hex: 0x23395D), "umber": Color(hex: 0x5C3D24), "ochre": Color(hex: 0xB07D2C), "black": Color(hex: 0x1A1A1A), "grey": Color(hex: 0x6B6B6B), "white": Color(hex: 0xE6E0D2), "purple": Color(hex: 0x5B3A7A), "teal": Color(hex: 0x2B6B6B), "olive": Color(hex: 0x6B6B2B), "sand": Color(hex: 0xC8B38A)]

    var body: some View {
        let skin = Self.skin[portrait.skin] ?? Self.skin["tan"]!
        let hairColor = Self.hair[portrait.hair]
        let eyeColor = Self.eyes[portrait.eyes] ?? Self.eyes["brown"]!
        let cloth = Self.clothing[portrait.clothing] ?? Self.clothing["umber"]!
        let hairOn = hairColor != nil && portrait.hairStyle != "bald"
        let longHair = hairOn && (portrait.hairStyle == "long" || portrait.hairStyle == "braided")
        let s = size / 100

        ZStack {
            Circle().fill(Color(hex: 0x3A2718))
            ZStack {
                if longHair, let h = hairColor {
                    RoundedRectangle(cornerRadius: 14 * s).fill(h).frame(width: 40 * s, height: 44 * s).position(x: 50 * s, y: 56 * s)
                }
                // shoulders
                Ellipse().fill(cloth).frame(width: 64 * s, height: 40 * s).position(x: 50 * s, y: 90 * s)
                Rectangle().fill(cloth).frame(width: 64 * s, height: 20 * s).position(x: 50 * s, y: 100 * s)
                // neck and head
                Rectangle().fill(skin.opacity(0.9)).frame(width: 12 * s, height: 16 * s).position(x: 50 * s, y: 64 * s)
                Circle().fill(skin).frame(width: 6.4 * s).position(x: 33 * s, y: 46 * s)
                Circle().fill(skin).frame(width: 6.4 * s).position(x: 67 * s, y: 46 * s)
                Ellipse().fill(skin).frame(width: 34 * s, height: 40 * s).position(x: 50 * s, y: 45 * s)
                // eyes
                Ellipse().fill(.white).frame(width: 6.4 * s, height: 4.4 * s).position(x: 43 * s, y: 44 * s)
                Ellipse().fill(.white).frame(width: 6.4 * s, height: 4.4 * s).position(x: 57 * s, y: 44 * s)
                Circle().fill(eyeColor).frame(width: 3.4 * s).position(x: 43.5 * s, y: 44.3 * s)
                Circle().fill(eyeColor).frame(width: 3.4 * s).position(x: 57.5 * s, y: 44.3 * s)
                // mouth
                Capsule().fill(skin.opacity(0.5)).frame(width: 10 * s, height: 1.6 * s).position(x: 50 * s, y: 58 * s)
                if portrait.scar {
                    Capsule().fill(Color.black.opacity(0.25)).frame(width: 1.4 * s, height: 13 * s).rotationEffect(.degrees(-18)).position(x: 60 * s, y: 42 * s)
                }
                // facial hair
                if let fh = hairColor ?? Self.hair["brown"] {
                    switch portrait.facialHair {
                    case "stubble": Ellipse().fill(fh.opacity(0.25)).frame(width: 28 * s, height: 16 * s).position(x: 50 * s, y: 58 * s)
                    case "moustache": Capsule().fill(fh).frame(width: 16 * s, height: 3 * s).position(x: 50 * s, y: 54 * s)
                    case "beard": Ellipse().fill(fh).frame(width: 30 * s, height: 20 * s).position(x: 50 * s, y: 62 * s)
                    case "fullbeard":
                        Ellipse().fill(fh).frame(width: 34 * s, height: 30 * s).position(x: 50 * s, y: 62 * s)
                        Capsule().fill(fh).frame(width: 16 * s, height: 3 * s).position(x: 50 * s, y: 54 * s)
                    default: EmptyView()
                    }
                }
                // hair on top
                if hairOn, let h = hairColor {
                    Ellipse().fill(h).frame(width: 36 * s, height: 22 * s).position(x: 50 * s, y: 32 * s)
                    if portrait.hairStyle == "curly" {
                        ForEach([36, 46, 56, 65], id: \.self) { x in
                            Circle().fill(h).frame(width: 10 * s).position(x: CGFloat(x) * s, y: (x == 36 || x == 65 ? 30 : 24) * s)
                        }
                    }
                    if portrait.hairStyle == "topknot" {
                        Circle().fill(h).frame(width: 12 * s).position(x: 50 * s, y: 20 * s)
                    }
                }
                // headwear
                switch portrait.headwear {
                case "hood": Ellipse().fill(cloth.opacity(0.9)).frame(width: 52 * s, height: 46 * s).position(x: 50 * s, y: 36 * s).mask(Rectangle().frame(width: 60 * s, height: 30 * s).position(x: 50 * s, y: 28 * s))
                case "helmet": Ellipse().fill(Color(hex: 0x8A8F96)).frame(width: 38 * s, height: 30 * s).position(x: 50 * s, y: 34 * s).mask(Rectangle().frame(width: 40 * s, height: 20 * s).position(x: 50 * s, y: 29 * s))
                case "crown": Rectangle().fill(Theme.gold).frame(width: 34 * s, height: 6 * s).position(x: 50 * s, y: 31 * s)
                case "hat":
                    Ellipse().fill(Color(hex: 0x1F1A17)).frame(width: 52 * s, height: 10 * s).position(x: 50 * s, y: 32 * s)
                    Rectangle().fill(Color(hex: 0x2B2420)).frame(width: 26 * s, height: 18 * s).position(x: 50 * s, y: 23 * s)
                case "turban": Ellipse().fill(cloth).frame(width: 40 * s, height: 26 * s).position(x: 50 * s, y: 28 * s)
                case "headscarf", "veil": Ellipse().fill(cloth.opacity(portrait.headwear == "veil" ? 0.6 : 1)).frame(width: 38 * s, height: 24 * s).position(x: 50 * s, y: 32 * s)
                case "cap": Ellipse().fill(cloth.opacity(0.85)).frame(width: 34 * s, height: 16 * s).position(x: 50 * s, y: 31 * s)
                case "laurel": Circle().stroke(Color(hex: 0x5F8F4A), lineWidth: 3.5 * s).frame(width: 34 * s).position(x: 50 * s, y: 33 * s).mask(Rectangle().frame(width: 40 * s, height: 14 * s).position(x: 50 * s, y: 30 * s))
                default: EmptyView()
                }
            }
            .clipShape(Circle())
            Circle().stroke(ring, lineWidth: max(1, 2 * s))
            ZStack {
                Circle().fill(Theme.wood)
                Circle().stroke(ring, lineWidth: max(1, 1.5 * s))
                Text(portrait.symbol).font(.system(size: 13 * s))
            }
            .frame(width: 24 * s, height: 24 * s)
            .position(x: 80 * s, y: 80 * s)
        }
        .frame(width: size, height: size)
        .accessibilityLabel("Portrait")
    }
}

extension Color {
    init(hex: UInt32) {
        self.init(red: Double((hex >> 16) & 0xFF) / 255, green: Double((hex >> 8) & 0xFF) / 255, blue: Double(hex & 0xFF) / 255)
    }
}
