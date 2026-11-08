package app.lettercrack.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/**
 * Home-screen widget: the start of today's quote in code, the streak and "Solved" once done.
 * The app writes a snapshot covering the next few days (see src/lib/widget.ts), so the widget
 * stays right after midnight even if the app is not opened. Nothing here is a countdown.
 */
class LetterCrackWidget : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    for (id in ids) manager.updateAppWidget(id, render(context))
  }

  companion object {
    private const val PREFS = "lettercrack_widget"
    private const val KEY = "data"

    fun save(context: Context, json: String) {
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, json).apply()
    }

    fun refreshAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, LetterCrackWidget::class.java))
      for (id in ids) manager.updateAppWidget(id, render(context))
    }

    private fun day(offset: Int): String {
      val c = Calendar.getInstance()
      c.add(Calendar.DAY_OF_YEAR, offset)
      return SimpleDateFormat("yyyy-MM-dd", Locale.US).format(c.time)
    }

    fun render(context: Context): RemoteViews {
      val views = RemoteViews(context.packageName, R.layout.widget_lettercrack)
      context.packageManager.getLaunchIntentForPackage(context.packageName)?.let { launch ->
        val pending = PendingIntent.getActivity(context, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        views.setOnClickPendingIntent(R.id.lc_root, pending)
      }
      val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null)
      val data = try {
        if (raw != null) JSONObject(raw) else null
      } catch (e: Exception) {
        null
      }
      if (data == null) {
        views.setTextViewText(R.id.lc_cipher, "")
        views.setTextViewText(R.id.lc_status, "")
        return views
      }
      val strings = data.optJSONObject("strings") ?: JSONObject()
      views.setTextViewText(R.id.lc_title, strings.optString("title", "LetterCrack"))

      val today = day(0)
      val entry = data.optJSONObject("days")?.optJSONObject(today)
      val solved = entry?.optBoolean("solved", false) ?: false
      views.setTextViewText(R.id.lc_cipher, entry?.optString("cipher", "") ?: "")
      views.setTextViewText(
        R.id.lc_status,
        when {
          entry == null -> strings.optString("newDay")
          solved -> strings.optString("solved")
          else -> strings.optString("play")
        },
      )

      // Streak as the app would show it on that day (freezes included), computed by the app.
      val label = entry?.optString("streakLabel", "") ?: ""
      if (label.isNotEmpty()) {
        views.setTextViewText(R.id.lc_streak, label)
        views.setViewVisibility(R.id.lc_streak, View.VISIBLE)
      } else {
        views.setViewVisibility(R.id.lc_streak, View.GONE)
      }
      return views
    }
  }
}
