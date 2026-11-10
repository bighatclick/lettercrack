package app.lettercrack.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
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
 *
 * The 30-minute system update alone left yesterday's quote up for up to half an hour after
 * midnight (D41), so every render also books a one-off alarm a few seconds after the next local
 * midnight, and a clock or time-zone change re-renders at once.
 */
class LetterCrackWidget : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    for (id in ids) manager.updateAppWidget(id, render(context))
    scheduleMidnight(context)
  }

  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      ACTION_MIDNIGHT,
      Intent.ACTION_TIME_CHANGED,
      Intent.ACTION_TIMEZONE_CHANGED,
      Intent.ACTION_DATE_CHANGED,
      Intent.ACTION_BOOT_COMPLETED,
      Intent.ACTION_MY_PACKAGE_REPLACED -> refreshAll(context)
      else -> super.onReceive(context, intent)
    }
  }

  override fun onDisabled(context: Context) {
    context.getSystemService(AlarmManager::class.java)?.cancel(midnightIntent(context))
  }

  companion object {
    private const val PREFS = "lettercrack_widget"
    private const val KEY = "data"
    private const val ACTION_MIDNIGHT = "app.lettercrack.widget.MIDNIGHT"

    fun save(context: Context, json: String) {
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, json).apply()
    }

    fun refreshAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, LetterCrackWidget::class.java))
      for (id in ids) manager.updateAppWidget(id, render(context))
      if (ids.isNotEmpty()) scheduleMidnight(context)
    }

    private fun midnightIntent(context: Context): PendingIntent {
      val intent = Intent(context, LetterCrackWidget::class.java).setAction(ACTION_MIDNIGHT)
      return PendingIntent.getBroadcast(context, 1, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    /** One alarm at 00:00:05 local time. Exact where Android allows it without a permission prompt
     *  (before Android 12, or if the user granted exact alarms); otherwise a 10-minute window, the
     *  shortest Android gives. setAndAllowWhileIdle was measured up to an hour late (D41). */
    private fun scheduleMidnight(context: Context) {
      val alarms = context.getSystemService(AlarmManager::class.java) ?: return
      val next = Calendar.getInstance().apply {
        add(Calendar.DAY_OF_YEAR, 1)
        set(Calendar.HOUR_OF_DAY, 0)
        set(Calendar.MINUTE, 0)
        set(Calendar.SECOND, 5)
        set(Calendar.MILLISECOND, 0)
      }
      val pending = midnightIntent(context)
      try {
        val exact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarms.canScheduleExactAlarms()
        if (exact) {
          alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next.timeInMillis, pending)
        } else {
          alarms.setWindow(AlarmManager.RTC_WAKEUP, next.timeInMillis, 10 * 60 * 1000L, pending)
        }
      } catch (e: Exception) {
        // A missed alarm only means the 30-minute update catches up; never crash the widget.
      }
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
