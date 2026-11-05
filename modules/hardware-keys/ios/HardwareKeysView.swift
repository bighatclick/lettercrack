import ExpoModulesCore
import UIKit

/// Invisible view that becomes first responder (it is not a text input, so no on-screen keyboard
/// appears) and reports hardware key presses: letters, delete and arrows (iPad, spec §11).
class HardwareKeysView: ExpoView {
  let onKey = EventDispatcher()

  override var canBecomeFirstResponder: Bool { true }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window != nil {
      DispatchQueue.main.async { [weak self] in
        _ = self?.becomeFirstResponder()
      }
    }
  }

  override func pressesBegan(_ presses: Set<UIPress>, with event: UIPressesEvent?) {
    var handled = false
    for press in presses {
      guard let key = press.key else { continue }
      if !key.modifierFlags.intersection([.command, .control, .alternate]).isEmpty { continue }
      switch key.keyCode {
      case .keyboardDeleteOrBackspace, .keyboardDeleteForward:
        onKey(["key": "Backspace"])
        handled = true
      case .keyboardLeftArrow:
        onKey(["key": "ArrowLeft"])
        handled = true
      case .keyboardRightArrow:
        onKey(["key": "ArrowRight"])
        handled = true
      default:
        let chars = key.charactersIgnoringModifiers.uppercased()
        if chars.count == 1, let c = chars.unicodeScalars.first, c.value >= 65, c.value <= 90 {
          onKey(["key": chars])
          handled = true
        }
      }
    }
    if !handled {
      super.pressesBegan(presses, with: event)
    }
  }
}
