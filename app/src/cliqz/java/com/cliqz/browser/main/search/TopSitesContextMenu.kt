package com.cliqz.browser.main.search

import acr.browser.lightning.bus.BrowserEvents
import acr.browser.lightning.utils.Utils
import android.app.Activity
import android.view.MenuItem
import android.view.View
import android.widget.PopupMenu
import com.cliqz.browser.R
import com.cliqz.browser.webview.Topsite

class TopSitesContextMenu(
        private val view: View,
        private val freshTab: Freshtab,
        private val topSite: Topsite
) :
        PopupMenu(view.context, view), PopupMenu.OnMenuItemClickListener {

    override fun onMenuItemClick(item: MenuItem) = when (item.itemId) {
        R.id.open_new_tab -> {
            freshTab.bus.post(BrowserEvents.OpenUrlInNewTab(null, topSite.url, false))
            true
        }
        R.id.open_forget_tab -> {
            freshTab.bus.post(BrowserEvents.OpenUrlInNewTab(null, topSite.url, true))
            true
        }
        R.id.remove -> {
            freshTab.historyDatabase.blockDomainsForTopsites(topSite.domain)
            freshTab.refreshTopsites()
            Utils.showSnackbar(view.context as Activity,
                    view.context.getString(R.string.snackbar_topsite_removed),
                    view.context.getString(R.string.action_undo)) {
                freshTab.historyDatabase.removeDomainFromBlockedTopSites(topSite.domain)
                freshTab.refreshTopsites()
            }
            true
        }
        else -> false
    }

    companion object {
        @JvmStatic
        fun showMenu(view: View, freshTab: Freshtab, topSite: Topsite) {
            val menu = TopSitesContextMenu(view, freshTab, topSite)
            menu.inflate(R.menu.topsites_context_menu)
            menu.setOnMenuItemClickListener(menu)
            menu.show()
        }
    }
}
