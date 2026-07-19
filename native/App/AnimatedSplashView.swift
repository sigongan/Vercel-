import UIKit

/// The bouncing-avocado launch screen, drawn natively so it animates from
/// the very first frame after launch (the OS LaunchScreen itself must stay
/// static — this view takes over the instant the app process is running,
/// which is how apps like Tiimo get their "opens with an animation" feel).
/// Shown by AvocatoViewController on top of the webview while the remote
/// web app loads; dismissed when the web signals ready (SplashReadyPlugin).
final class AnimatedSplashView: UIView {

    private let avocado = CALayer()
    private let shadow = CAShapeLayer()

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = UIColor(red: 0.980, green: 0.980, blue: 0.969, alpha: 1) // #FAFAF7

        buildAvocado()
        buildShadow()
        buildLabel()
        startAnimations()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) is not used")
    }

    // MARK: layout

    private let avocadoSize: CGFloat = 96

    override func layoutSubviews() {
        super.layoutSubviews()
        let cx = bounds.midX
        let cy = bounds.midY - 30
        avocado.position = CGPoint(x: cx, y: cy)
        shadow.position = CGPoint(x: cx, y: cy + avocadoSize / 2 + 22)
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

    // MARK: shadow + label

    private func buildShadow() {
        shadow.bounds = CGRect(x: 0, y: 0, width: 44, height: 10)
        shadow.path = UIBezierPath(ovalIn: shadow.bounds).cgPath
        shadow.fillColor = UIColor(red: 0.302, green: 0.486, blue: 0.059, alpha: 1).cgColor // #4D7C0F
        layer.addSublayer(shadow)
    }

    private let label = UILabel()

    private func buildLabel() {
        label.text = "Warming up the kitchen…"
        label.textAlignment = .center
        label.font = .systemFont(ofSize: 15, weight: .medium)
        label.textColor = UIColor(red: 0.365, green: 0.396, blue: 0.318, alpha: 1) // #5D6551
        addSubview(label)
    }

    // MARK: animation (mirrors the web overlay's 0.6s bounce)

    private func startAnimations() {
        let bounce = CABasicAnimation(keyPath: "transform.translation.y")
        bounce.fromValue = 0
        bounce.toValue = -16
        bounce.duration = 0.3
        bounce.autoreverses = true
        bounce.repeatCount = .infinity
        bounce.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
        avocado.add(bounce, forKey: "bounce")

        let squash = CABasicAnimation(keyPath: "transform.scale.x")
        squash.fromValue = 1
        squash.toValue = 0.72
        squash.duration = 0.3
        squash.autoreverses = true
        squash.repeatCount = .infinity
        squash.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
        shadow.add(squash, forKey: "squash")

        let fade = CABasicAnimation(keyPath: "opacity")
        fade.fromValue = 1
        fade.toValue = 0.45
        fade.duration = 0.9
        fade.autoreverses = true
        fade.repeatCount = .infinity
        fade.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
        label.layer.add(fade, forKey: "pulse")
    }
}
