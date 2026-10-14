package com.orbit.app
import android.content.Intent
import android.net.Uri
import android.os.Bundle;
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {
   override fun onCreate(savedInstanceState: Bundle?) {
        // Skip on state restore / relaunch from Recents: the system re-delivers the
        // original SEND intent there, and re-importing it would duplicate the import.
        val launchedFromHistory =
            ((intent?.flags ?: 0) and Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY) != 0
        if (savedInstanceState == null && !launchedFromHistory) {
          rewriteShareIntent(intent)
        }
        super.onCreate(null)
      }

  override fun onNewIntent(intent: Intent) {
    rewriteShareIntent(intent)
    setIntent(intent)
    super.onNewIntent(intent)
  }

  /**
   * Converts an incoming Share Sheet intent (ACTION_SEND, text/plain) into a
   * com.orbit.app://share?text=... VIEW intent so React Native's Linking API
   * delivers it to JS (getInitialURL on cold start, 'url' event on warm start).
   */
  private fun rewriteShareIntent(intent: Intent?) {
    if (intent == null || intent.action != Intent.ACTION_SEND || intent.type != "text/plain") {
      return
    }
    val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
    // Consume the extra so a resumed activity never re-processes the same share
    intent.removeExtra(Intent.EXTRA_TEXT)
    if (sharedText.isNullOrBlank()) {
      return
    }
    intent.action = Intent.ACTION_VIEW
    intent.data = Uri.parse("com.orbit.app://share?text=" + Uri.encode(sharedText))
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "Orbit"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
