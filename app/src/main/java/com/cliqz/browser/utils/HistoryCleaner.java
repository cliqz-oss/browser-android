package com.cliqz.browser.utils;

import android.app.ProgressDialog;
import android.content.Context;
import android.os.Handler;
import android.support.annotation.NonNull;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;

import javax.inject.Inject;

import acr.browser.lightning.database.HistoryDatabase;
import acr.browser.lightning.preference.PreferenceManager;

import static acr.browser.lightning.preference.PreferenceManager.ClearQueriesOptions.CLEAR_QUERIES;
import static acr.browser.lightning.preference.PreferenceManager.ClearQueriesOptions.CLEAR_QUERIES_INCLUDING_FAVORITES;

/**
 * @author Stefano Pacifici
 * @date 2016/02/24
 */
public class HistoryCleaner {

    private Context context;
    private boolean deleteFavorites = false;
    private boolean deleteQueries = false;
    private Handler handler;

    @Inject
    HistoryDatabase historyDatabase;

    @Inject
    PreferenceManager preferenceManager;

    public static class Builder {

        private final HistoryCleaner cleaner;

        private Builder() { cleaner = new HistoryCleaner(); }

        public Builder setContext(@NonNull Context context) {
            cleaner.context = context;
            return this;
        }

        public Builder setDeleteFavorites(boolean value) {
            cleaner.deleteFavorites = value;
            return this;
        }

        public Builder setDeleteQueries(boolean value) {
            cleaner.deleteQueries = value;
            return this;
        }

        public HistoryCleaner build() {
            if (cleaner.context == null) {
                throw new RuntimeException("No context provided");
            }
            return cleaner;
        }
    }

    public static Builder builder() {
        return new Builder();
    }

    private HistoryCleaner() {
        BrowserApp.getAppComponent().inject(this);
    }

    public void cleanup() {
        final Handler handler = new Handler(context.getMainLooper());
        final ProgressDialog progressDialog =
                ProgressDialog.show(context, context.getString(R.string.clear_history),
                        context.getString(R.string.deleting_in_progress_message), true, false);
        if (deleteQueries) {
            preferenceManager.setShouldClearQueries(deleteFavorites
                    ? CLEAR_QUERIES_INCLUDING_FAVORITES : CLEAR_QUERIES);
        }
        new Thread(new Runnable() {
            @Override
            public void run() {
                historyDatabase.clearHistory(deleteFavorites);
                handler.post(new Runnable() {
                    @Override
                    public void run() {
                        progressDialog.dismiss();
                    }
                });
            }
        }).start();
    }
}
