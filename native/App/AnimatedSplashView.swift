import UIKit

/// The launch screen, drawn natively so it's on screen from the very first
/// frame after launch (the OS LaunchScreen itself must stay static — this
/// view takes over the instant the app process is running). The bounce below
/// is a CALayer transform animation, which runs on the render server rather
/// than the main thread — it doesn't compete with the webview's JS work, so
/// it stays smooth while the remote web app loads in the background.
/// Shown by AvocatoViewController on top of the webview while the remote
/// web app loads; dismissed when the web signals ready (SplashReadyPlugin).
final class AnimatedSplashView: UIView {

    private let avocado = CALayer()
    private let gradient = CAGradientLayer()

    override init(frame: CGRect) {
        super.init(frame: frame)

        // Same diagonal cream-to-sage wash as resources/splash.png (the OS
        // launch image this view replaces), so there's no color jump.
        gradient.colors = [
            UIColor(red: 0.980, green: 0.980, blue: 0.969, alpha: 1).cgColor, // #FAFAF7
            UIColor(red: 0.769, green: 0.894, blue: 0.518, alpha: 1).cgColor, // #C4E484
        ]
        gradient.startPoint = CGPoint(x: 0, y: 0)
        gradient.endPoint = CGPoint(x: 1, y: 1)
        layer.addSublayer(gradient)

        buildAvocado()
        buildLabel()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) is not used")
    }

    // MARK: layout

    private let avocadoSize: CGFloat = 96

    override func layoutSubviews() {
        super.layoutSubviews()
        gradient.frame = bounds
        let cx = bounds.midX
        // Dead center, not offset — matches resources/splash.png's static
        // OS launch image exactly, so there's no visible jump when this
        // view replaces it the instant the app process starts.
        let cy = bounds.midY
        avocado.position = CGPoint(x: cx, y: cy)
        label.frame = CGRect(x: 0, y: cy + avocadoSize / 2 + 44, width: bounds.width, height: 24)
    }

    // MARK: avocado drawing (same geometry as the web AvocadoMark SVG, 100×100 space)

    private func buildAvocado() {
        avocado.bounds = CGRect(x: 0, y: 0, width: 100, height: 100)
        let scale = avocadoSize / 100
        avocado.transform = CATransform3DMakeScale(scale, scale, 1)

        let skin = CAShapeLayer()
        skin.path = skinPath().cgPath
        skin.fillColor = UIColor(red: 0.247, green: 0.384, blue: 0.071, alpha: 1).cgColor // #3f6212

        let flesh = CAShapeLayer()
        flesh.path = fleshPath().cgPath
        flesh.fillColor = UIColor(red: 0.851, green: 0.976, blue: 0.616, alpha: 1).cgColor // #d9f99d

        let pit = CAShapeLayer()
        pit.path = UIBezierPath(ovalIn: CGRect(x: 50 - 13.5, y: 63 - 13.5, width: 27, height: 27)).cgPath
        pit.fillColor = UIColor(red: 0.522, green: 0.302, blue: 0.055, alpha: 1).cgColor // #854d0e

        let glint = CAShapeLayer()
        glint.path = UIBezierPath(ovalIn: CGRect(x: 45.5 - 4, y: 58.5 - 4, width: 8, height: 8)).cgPath
        glint.fillColor = UIColor(red: 0.631, green: 0.384, blue: 0.027, alpha: 1).cgColor // #a16207

        avocado.addSublayer(skin)
        avocado.addSublayer(flesh)
        avocado.addSublayer(pit)
        avocado.addSublayer(glint)
        layer.addSublayer(avocado)

        addBounceAnimation()
    }

    /// A gentle squash-and-stretch loop — "transform.scale" is a uniform
    /// multiplier on top of the static sizing transform set above, so it
    /// bounces around the same 96pt size rather than needing to know it.
    private func addBounceAnimation() {
        let bounce = CAKeyframeAnimation(keyPath: "transform.scale")
        bounce.values = [1.0, 1.12, 0.95, 1.04, 1.0]
        bounce.keyTimes = [0, 0.32, 0.58, 0.8, 1.0]
        bounce.duration = 1.15
        bounce.repeatCount = .infinity
        bounce.timingFunctions = [
            CAMediaTimingFunction(name: .easeOut),
            CAMediaTimingFunction(name: .easeInEaseOut),
            CAMediaTimingFunction(name: .easeInEaseOut),
            CAMediaTimingFunction(name: .easeOut),
        ]
        avocado.add(bounce, forKey: "bounce")
    }

    private func skinPath() -> UIBezierPath {
        let p = UIBezierPath()
        p.move(to: CGPoint(x: 50, y: 8))
        p.addCurve(to: CGPoint(x: 65.5, y: 31), controlPoint1: CGPoint(x: 59, y: 8), controlPoint2: CGPoint(x: 64, y: 20))
        p.addCurve(to: CGPoint(x: 81, y: 66), controlPoint1: CGPoint(x: 78, y: 39), controlPoint2: CGPoint(x: 83, y: 54))
        p.addCurve(to: CGPoint(x: 50, y: 94), controlPoint1: CGPoint(x: 78, y: 85), controlPoint2: CGPoint(x: 63, y: 94))
        p.addCurve(to: CGPoint(x: 19, y: 66), controlPoint1: CGPoint(x: 37, y: 94), controlPoint2: CGPoint(x: 22, y: 85))
        p.addCurve(to: CGPoint(x: 34.5, y: 31), controlPoint1: CGPoint(x: 17, y: 54), controlPoint2: CGPoint(x: 22, y: 39))
        p.addCurve(to: CGPoint(x: 50, y: 8), controlPoint1: CGPoint(x: 36, y: 20), controlPoint2: CGPoint(x: 41, y: 8))
        p.close()
        return p
    }

    private func fleshPath() -> UIBezierPath {
        let p = UIBezierPath()
        p.move(to: CGPoint(x: 50, y: 16))
        p.addCurve(to: CGPoint(x: 62.5, y: 35.5), controlPoint1: CGPoint(x: 57, y: 16), controlPoint2: CGPoint(x: 61, y: 26))
        p.addCurve(to: CGPoint(x: 75.5, y: 65), controlPoint1: CGPoint(x: 73, y: 42.5), controlPoint2: CGPoint(x: 77.5, y: 55))
        p.addCurve(to: CGPoint(x: 50, y: 88), controlPoint1: CGPoint(x: 73, y: 81), controlPoint2: CGPoint(x: 60.5, y: 88))
        p.addCurve(to: CGPoint(x: 24.5, y: 65), controlPoint1: CGPoint(x: 39.5, y: 88), controlPoint2: CGPoint(x: 27, y: 81))
        p.addCurve(to: CGPoint(x: 37.5, y: 35.5), controlPoint1: CGPoint(x: 22.5, y: 55), controlPoint2: CGPoint(x: 27, y: 42.5))
        p.addCurve(to: CGPoint(x: 50, y: 16), controlPoint1: CGPoint(x: 39, y: 26), controlPoint2: CGPoint(x: 43, y: 16))
        p.close()
        return p
    }

    // MARK: label

    private let label = UILabel()

    private func buildLabel() {
        label.text = "Warming up the kitchen…"
        label.textAlignment = .center
        label.font = .systemFont(ofSize: 15, weight: .medium)
        label.textColor = UIColor(red: 0.365, green: 0.396, blue: 0.318, alpha: 1) // #5D6551
        addSubview(label)
    }
}
