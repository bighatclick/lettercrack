package app.lettercrack.hardwarekeys

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class HardwareKeysModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("HardwareKeys")

    View(HardwareKeysView::class) {
      Events("onKey")
    }
  }
}
