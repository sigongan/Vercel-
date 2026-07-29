import Foundation

/// Shared JSON coders for everything that crosses the wire or hits disk.
///
/// They exist mainly for one reason: the stock `.iso8601` decoding strategy
/// accepts whole seconds only, and rejects a fractional part outright.
/// PostgREST serializes `timestamptz` with fractional seconds
/// (`2026-07-28T10:30:00.123456+00:00`), which is what `saved_recipes.
/// created_at` comes back as — so `.iso8601` would fail to decode the
/// recipe list.
///
/// The exact shape wasn't confirmed against a live row, so this deliberately
/// accepts both: fractional seconds first, plain second. Either format
/// round-trips, which makes the question moot rather than load-bearing.
/// `nonisolated` on the type, not just its members: a project built with
/// Xcode's newer "Default Actor Isolation: Main Actor" setting implicitly
/// isolates every declaration to `@MainActor` unless told otherwise, which
/// would make `decoder`/`encoder` unreachable from `RecipeStore` — its own
/// actor, deliberately not the main one, decoding on a background thread.
/// This keeps that correct regardless of which isolation mode the project
/// happens to be building under.
nonisolated enum JSONCoding {
    static let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let raw = try decoder.singleValueContainer().decode(String.self)
            guard let date = parseDate(raw) else {
                throw DecodingError.dataCorrupted(
                    .init(
                        codingPath: decoder.codingPath,
                        debugDescription: "Not an ISO 8601 date: \(raw)"
                    )
                )
            }
            return date
        }
        return decoder
    }()

    static let encoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }()

    private static let withFractional: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    private static let withoutFractional: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()

    static func parseDate(_ raw: String) -> Date? {
        withFractional.date(from: raw) ?? withoutFractional.date(from: raw)
    }
}
