import SwiftUI

/// Dark wood, candlelight and parchment: the look of a tavern after midnight.
enum Theme {
    static let wood = Color(red: 0.11, green: 0.08, blue: 0.06)
    static let woodLight = Color(red: 0.18, green: 0.13, blue: 0.10)
    static let woodBorder = Color(red: 0.31, green: 0.23, blue: 0.17)
    static let parchment = Color(red: 0.95, green: 0.90, blue: 0.78)
    static let ember = Color(red: 0.88, green: 0.56, blue: 0.17)
    static let muted = Color(red: 0.66, green: 0.57, blue: 0.48)
    static let blood = Color(red: 0.78, green: 0.24, blue: 0.20)
    static let moss = Color(red: 0.42, green: 0.64, blue: 0.36)
    static let gold = Color(red: 0.93, green: 0.76, blue: 0.32)

    static func display(_ size: CGFloat, weight: Font.Weight = .semibold) -> Font {
        .system(size: size, weight: weight, design: .serif)
    }
    static let body = Font.system(size: 17, design: .serif)
    static let small = Font.system(size: 13, design: .serif)
    static let caption = Font.system(size: 12, weight: .medium, design: .serif)

    static func color(for mood: Mood) -> Color {
        switch mood {
        case .calm: muted
        case .tense: ember
        case .mysterious: Color(red: 0.55, green: 0.45, blue: 0.80)
        case .combat: blood
        case .triumphant: gold
        case .grim: Color(red: 0.50, green: 0.50, blue: 0.55)
        case .festive: Color(red: 0.90, green: 0.45, blue: 0.55)
        }
    }

    static func color(for attitude: Attitude) -> Color {
        switch attitude {
        case .friendly: moss
        case .neutral: muted
        case .suspicious: ember
        case .hostile: blood
        }
    }
}

struct TavernBackground: View {
    var body: some View {
        LinearGradient(colors: [Theme.wood, Color(red: 0.05, green: 0.03, blue: 0.02)], startPoint: .top, endPoint: .bottom)
            .ignoresSafeArea()
    }
}

struct TavernCard: ViewModifier {
    var accent: Color? = nil

    func body(content: Content) -> some View {
        content
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.woodLight, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(accent ?? Theme.woodBorder, lineWidth: 1)
            )
    }
}

extension View {
    func tavernCard(accent: Color? = nil) -> some View {
        modifier(TavernCard(accent: accent))
    }
}

struct EmberButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(Theme.display(17))
            .foregroundStyle(Theme.wood)
            .padding(.vertical, 13)
            .frame(maxWidth: .infinity)
            .background(Theme.ember, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            .opacity(configuration.isPressed ? 0.8 : 1)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
    }
}

struct QuietButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(Theme.display(16, weight: .medium))
            .foregroundStyle(Theme.parchment)
            .padding(.vertical, 12)
            .frame(maxWidth: .infinity)
            .background(Theme.woodLight, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(Theme.woodBorder, lineWidth: 1))
            .opacity(configuration.isPressed ? 0.8 : 1)
    }
}

/// Renders the Dungeon Master's Markdown narration (bold, italics, quotes) with paragraphs preserved.
struct NarrationText: View {
    let markdown: String

    var body: some View {
        Text(attributed)
            .font(Theme.body)
            .foregroundStyle(Theme.parchment)
            .lineSpacing(5)
            .fixedSize(horizontal: false, vertical: true)
    }

    private var attributed: AttributedString {
        let options = AttributedString.MarkdownParsingOptions(interpretedSyntax: .inlineOnlyPreservingWhitespace)
        return (try? AttributedString(markdown: markdown, options: options)) ?? AttributedString(markdown)
    }
}

/// A placeholder-capable multi-line text box on the tavern palette.
struct ParchmentEditor: View {
    let placeholder: String
    @Binding var text: String
    var minHeight: CGFloat = 120

    var body: some View {
        ZStack(alignment: .topLeading) {
            if text.isEmpty {
                Text(placeholder)
                    .font(Theme.body)
                    .foregroundStyle(Theme.muted)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 16)
            }
            TextEditor(text: $text)
                .font(Theme.body)
                .foregroundStyle(Theme.parchment)
                .scrollContentBackground(.hidden)
                .padding(.horizontal, 10)
                .padding(.vertical, 8)
                .frame(minHeight: minHeight)
        }
        .background(Theme.woodLight, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(Theme.woodBorder, lineWidth: 1))
    }
}

struct SectionHeader: View {
    let text: String
    var body: some View {
        Text(text.uppercased())
            .font(Theme.caption)
            .tracking(1.5)
            .foregroundStyle(Theme.muted)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}
