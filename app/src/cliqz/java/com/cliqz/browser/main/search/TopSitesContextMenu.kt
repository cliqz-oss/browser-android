package com.cliqz.browser.main.search

import acr.browser.lightning.bus.BrowserEvents
import android.view.MenuItem
import android.view.View
import android.widget.PopupMenu
import com.cliqz.browser.R
import com.cliqz.browser.webview.Topsite
import com.google.android.material.snackbar.Snackbar

class TopSitesContextMenu(
        view: View,
        private val freshTab: Freshtab,
        private val topSite: Topsite
) :
        PopupMenu(view.context, view), PopupMenu.OnMenuItemClickListener {

    override fun onMenuItemClick(item: MenuItem) = when (item.itemId) {
        R.id.open_new_tab -> {
            freshTab.bus.post(BrowserEvents.OpenUrlInNewTab(topSite.url))
            true
        }
        R.id.open_forget_tab -> {
            freshTab.bus.post(BrowserEvents.OpenUrlInNewTab(topSite.url, true))
            true
        }
        R.id.remove -> {
            freshTab.historyDatabase.blockDomainsForTopsites(topSite.domain)
            freshTab.refreshTopsites()
            Snackbar.make(freshTab, R.string.snackbar_topsite_removed, Snackbar.LENGTH_LONG)
                    .setAction(R.string.btn_undo_topsite_removal) {
                        freshTab.historyDatabase.removeDomainFromBlockedTopSites(topSite.domain)
                        freshTab.refreshTopsites()
                    }
                    .show()
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
