package com.cliqz.browser.main;

import android.annotation.TargetApi;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ShortcutInfo;
import android.content.pm.ShortcutManager;
import android.graphics.drawable.Icon;
import android.net.Uri;
import android.os.Build;

import com.cliqz.browser.R;
import com.cliqz.browser.webview.Topsite;

import java.util.Collections;
import java.util.List;

import acr.browser.lightning.database.HistoryDatabase;
import timber.log.Timber;

/**
 * @author Ravjit Uppal
 */
@TargetApi(Build.VERSION_CODES.N_MR1)
class CliqzShortcutsHelper {

    private static final String TAG = CliqzShortcutsHelper.class.getSimpleName();

    private final Context context;
    private final ShortcutManager shortcutManager;
    private final HistoryDatabase historyDatabase;

    CliqzShortcutsHelper(Context context, HistoryDatabase historyDatabase) {
        this.context = context;
        this.historyDatabase = historyDatabase;
        shortcutManager = context.getSystemService(ShortcutManager.class);
        updateShortcuts();
    }

    void updateShortcuts() {
        final List<Topsite> topsites = historyDatabase.getTopSites(2);
        if (shortcutManager == null) {
            return;
        }
        shortcutManager.removeAllDynamicShortcuts();

        if (topsites.size() >= 1) {
            addShortcut(topsites.get(0), "top_sites_1");
        }

        if (topsites.size() >= 2) {
            addShortcut(topsites.get(1), "top_sites_2");
        }
    }

    private void addShortcut(Topsite topsite, String id) {
        try {
            final ShortcutInfo topSitesShortcut1 = new ShortcutInfo.Builder(context, id)
                    .setShortLabel(topsite.domain)
                    .setIcon(Icon.createWithResource(context, R.drawable.ic_top_site_shortcut))
                    .setIntent(new Intent(context, MainActivity.class)
                            .setAction(Intent.ACTION_VIEW)
                            .setData(Uri.parse(topsite.url)))
                    .build();
            shortcutManager.addDynamicShortcuts(Collections.singletonList(topSitesShortcut1));
        } catch (IllegalArgumentException e) {
            Timber.e(e, "Can't add a shortcut");
        }
    }
}
