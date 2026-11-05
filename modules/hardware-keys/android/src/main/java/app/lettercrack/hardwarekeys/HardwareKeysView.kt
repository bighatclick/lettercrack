package app.lettercrack.hardwarekeys

import android.content.Context
import android.view.KeyEvent
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView

/** Invisible focusable view that reports hardware key presses (letters, delete, arrows). */
class HardwareKeysView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val onKey by EventDispatcher()

  init {
    isFocusable = true
    isFocusableInTouchMode = true
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    post { requestFocus() }
  }

  override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
    if (event.isCtrlPressed || event.isAltPressed || event.isMetaPressed) return super.onKeyDown(keyCode, event)
    val key = when (keyCode) {
      KeyEvent.KEYCODE_DEL, KeyEvent.KEYCODE_FORWARD_DEL -> "Backspace"
      KeyEvent.KEYCODE_DPAD_LEFT -> "ArrowLeft"
      KeyEvent.KEYCODE_DPAD_RIGHT -> "ArrowRight"
      in KeyEvent.KEYCODE_A..KeyEvent.KEYCODE_Z -> ('A' + (keyCode - KeyEvent.KEYCODE_A)).toString()
      else -> null
    } ?: return super.onKeyDown(keyCode, event)
    onKey(mapOf("key" to key))
    return true
  }
}
