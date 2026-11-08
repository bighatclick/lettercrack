package app.lettercrack.widget

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** JS bridge: the app hands the widget a small JSON snapshot whenever progress changes. */
class HomeWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("HomeWidget")

    Function("setData") { json: String ->
      val context = appContext.reactContext ?: return@Function false
      LetterCrackWidget.save(context, json)
      LetterCrackWidget.refreshAll(context)
      true
    }
  }
}
