package acr.browser.lightning.view

import android.content.Context
import android.net.Uri
import com.cliqz.browser.app.BrowserApp

object DomainPermissions {

    enum class State {
        UNDECIDED,
        DENIED,
        GRANTED
    }

    private const val PREFERENCES_FILE_NAME = "domains_permissions"

    private val preferences by lazy {
        return@lazy BrowserApp.getAppContext()
                .getSharedPreferences(PREFERENCES_FILE_NAME, Context.MODE_PRIVATE)
    }

    fun checkPermissionForDomain(uri: String?, permission: Int): State {
        val key = key(uri, permission)
        return if (key == null)
            DomainPermissions.State.DENIED
        else DomainPermissions.State.valueOf(
                preferences.getString(key, State.UNDECIDED.name)!!
        )
    }

    fun setPermissionForDomain(uri: String?, permission: Int, state: State) {
        val key = key(uri, permission)
        if (key != null) {
            preferences.edit().putString(key, state.name).apply()
        }
    }

    private fun key(uri: String?, permission: Int): String? {
        val domain = if (uri != null) Uri.parse(uri).host?.replace('.', '_') else null
        return if (domain == null) null else "permission.$domain.$permission"
    }
}